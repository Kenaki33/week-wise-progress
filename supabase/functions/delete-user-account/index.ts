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
    
    // Create regular Supabase client to verify the JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    )

    // Verify the user's JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('JWT verification failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = user.id
    console.log('Deleting account for user:', userId)

    // Create admin client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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