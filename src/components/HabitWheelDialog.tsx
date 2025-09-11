import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HabitWheelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHabitSelected: (habit: string) => void;
  userId: string;
}

interface HabitWithDescription {
  name: string;
  task: string;
}

const personalityWheelMap = {
  carefree_gourmand: 'carefree_gourmand.html',
  express_consumer: 'express_consumer.html',
  emotional_snacker: 'emotional_snacker.html',
  unconscious_eater: 'unconscious_eater.html',
  organized_nutritionist: 'organized_nutritionist.html',
  dietary_perfectionist: 'dietary_perfectionist.html',
  eternal_dieter: 'eternal_dieter.html'
};

const personalityLabels = {
  carefree_gourmand: 'Beztroskiego Łasucha',
  express_consumer: 'Ekspresowego Konsumenta',
  emotional_snacker: 'Emocjonalnego Podjadacza',
  unconscious_eater: 'Nieświadomego Zjadacza',
  organized_nutritionist: 'Ogarniętego Odżywiacza',
  dietary_perfectionist: 'Perfekcjonisty Dietetycznego',
  eternal_dieter: 'Wiecznego Odchudzacza'
};

// Mapowanie możliwych wartości z bazy (PL/EN/slugi) do kanonicznych kluczy
const personalitySynonyms: Record<string, keyof typeof personalityWheelMap> = {
  // EN canonical
  carefree_gourmand: 'carefree_gourmand',
  express_consumer: 'express_consumer',
  emotional_snacker: 'emotional_snacker',
  unconscious_eater: 'unconscious_eater',
  organized_nutritionist: 'organized_nutritionist',
  dietary_perfectionist: 'dietary_perfectionist',
  eternal_dieter: 'eternal_dieter',
  // Common PL slugs/typos
  beztroski_lasuch: 'carefree_gourmand',
  beztroski_łasuch: 'carefree_gourmand',
  ekspresowy_konsument: 'express_consumer',
  emocjonalny_podjadacz: 'emotional_snacker',
  nieswiadomy_zjadacz: 'unconscious_eater',
  nieświadomy_zjadacz: 'unconscious_eater',
  ogarniety_odzywiacz: 'organized_nutritionist',
  ogarnięty_odżywiacz: 'organized_nutritionist',
  ogarniety_odzywiacze: 'organized_nutritionist',
  perfekcjonista_dietetyczny: 'dietary_perfectionist',
  wieczny_odchudzacz: 'eternal_dieter',
};

function normalizePersonality(value: string | null | undefined): keyof typeof personalityWheelMap {
  if (!value) return 'carefree_gourmand';
  const key = value.trim().toLowerCase().replace(/\s+/g, '_');
  return personalitySynonyms[key] ?? (personalityWheelMap[key as keyof typeof personalityWheelMap] ? (key as keyof typeof personalityWheelMap) : 'carefree_gourmand');
}

export function HabitWheelDialog({ open, onOpenChange, onHabitSelected, userId }: HabitWheelDialogProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [personality, setPersonality] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithDescription | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchUserPersonality();
    }
  }, [open, userId]);

  const fetchUserPersonality = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nutrition_personality')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user personality:', error);
        return;
      }

      setPersonality(normalizePersonality(data?.nutrition_personality));
    } catch (error) {
      console.error('Error:', error);
      setPersonality('carefree_gourmand');
    }
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'habit-wheel:selected') {
      setSelectedHabit({
        name: event.data.habit,
        task: event.data.task || ''
      });
    } else if (event.data?.type === 'habit-wheel:habit-confirmed') {
      onHabitSelected(event.data.habit);
      onOpenChange(false);
      setSelectedHabit(null);
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (open) {
      setIframeKey(prev => prev + 1);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !personality) {
      setHtmlContent(null);
      return;
    }
    const file = personalityWheelMap[personality as keyof typeof personalityWheelMap];
    const url = `${import.meta.env.BASE_URL}wheels/${file}`;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(`HTTP ${r.status}`)))
      .then((html) => {
        // Add CSS to scale down the wheel by 20%
        const scaledHtml = html.replace(
          '</head>',
          `<style>
            .wheel-container { 
              transform: scale(0.8); 
              transform-origin: center;
            }
            .app-container {
              padding-top: 1rem;
            }
          </style></head>`
        );
        setHtmlContent(scaledHtml);
      })
      .catch((err) => {
        console.error('Error loading wheel HTML:', err);
        setHtmlContent(null);
      });
  }, [open, personality]);

  if (!personality) return null;

  const wheelFile = personalityWheelMap[personality as keyof typeof personalityWheelMap];
  const personalityLabel = personalityLabels[personality as keyof typeof personalityLabels];

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[85vh] p-0 relative fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 transition-colors flex items-center justify-center text-white/70 hover:text-white"
          >
            ×
          </button>
          
          {selectedHabit && (
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-md">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{selectedHabit.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Szczegóły nawyku</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                          <Info className="h-4 w-4 text-gray-500" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-white border shadow-lg">
                        <p className="text-sm text-gray-700">{selectedHabit.task}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHabit(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          <DialogHeader className="sr-only">
            <DialogTitle>
              Koło fortuny nawyków
            </DialogTitle>
            <DialogDescription>
              Zakręć kołem, aby wylosować nawyk na ten tydzień.
            </DialogDescription>
          </DialogHeader>
          <div className="h-full w-full">
            <iframe
              key={iframeKey}
              {...(htmlContent ? { srcDoc: htmlContent } : { src: `${import.meta.env.BASE_URL}wheels/${wheelFile}` })}
              className="w-full h-full border-0 rounded-lg"
              title="Koło Fortuny Nawyków"
            />
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}