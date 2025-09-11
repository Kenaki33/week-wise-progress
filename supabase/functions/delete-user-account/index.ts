import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Decode JWT to get user id (sub) without creating a regular client
    const decodeJwt = (t: string) => {
      const parts = t.split('.')
      if (parts.length < 2) throw new Error('Invalid JWT structure')
      const payload = parts[1]
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
      const json = atob(normalized)
      return JSON.parse(json)
    }

    let userId: string
    try {
      const payload = decodeJwt(token)
      userId = payload.sub as string
      if (!userId) throw new Error('Token missing sub')
    } catch (e) {
      console.error('JWT decode failed:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Deleting account for user:', userId)

    // Create admin client with service_role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Delete user data in order (foreign key dependencies)
    console.log('Deleting badge_rewards...')
    const { error: badgeRewardsError } = await supabaseAdmin
      .from('badge_rewards')
      .delete()
      .eq('user_id', userId)

    if (badgeRewardsError) {
      console.error('Error deleting badge_rewards:', badgeRewardsError)
    }

    console.log('Deleting habits...')
    const { error: habitsError } = await supabaseAdmin
      .from('habits')
      .delete()
      .eq('user_id', userId)

    if (habitsError) {
      console.error('Error deleting habits:', habitsError)
    }

    console.log('Deleting profiles...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
    }

    // Finally, delete the user account from auth.users
    console.log('Deleting user account from auth.users...')
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Error deleting user account:', deleteUserError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user account', 
          details: deleteUserError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User account successfully deleted:', userId)

    return new Response(
      JSON.stringify({ success: true, message: 'Account successfully deleted' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in delete-user-account function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})