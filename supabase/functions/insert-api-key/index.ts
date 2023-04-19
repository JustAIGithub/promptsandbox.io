// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { corsHeaders } from '../_shared/cors.ts';
import { supabaseClient } from '../_shared/supabaseClient.ts';

serve(async (req) => {
	// This is needed if you're planning to invoke your function from a browser.
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	const supabase = supabaseClient(req);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return new Response('Not authorized', {
			status: 401,
			headers: {
				'content-type': 'application/json',
				...corsHeaders,
			},
		});
	}

	const { api_key } = await req.json();

	// call supabase function
	const { error } = await supabase.rpc('insert_user_api_key', {
		p_open_api_key: api_key,
		p_secret_key: Deno.env.get('PGSODIUM_SECRET_KEY') ?? '',
		p_user_id: user.id,
	});

	if (error) {
		return new Response(JSON.stringify(error), {
			status: 500,
			headers: {
				'content-type': 'application/json',
				...corsHeaders,
			},
		});
	}

	return new Response('OK', {
		headers: {
			'content-type': 'application/json',
			...corsHeaders,
		},
	});
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
