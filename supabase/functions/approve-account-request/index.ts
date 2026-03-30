import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let request_id: string | null = null;
  let direct_email: string | null = null;
  let direct_name: string | null = null;
  let direct_role: string | null = null;

  try {
    const text = await req.text();
    console.log('Raw body received:', text);

    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Empty request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = JSON.parse(text);
    request_id = body?.request_id ?? null;
    direct_email = body?.direct_email ?? null;
    direct_name = body?.direct_name ?? null;
    direct_role = body?.direct_role ?? null;

  } catch (parseErr) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body', details: String(parseErr) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';

    // ── DIRECT CREATION FLOW ──────────────────────────────────────────
    if (!request_id && direct_email) {
      const tempPassword = generatePassword();

      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: direct_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: direct_name, role: direct_role },
      });

      if (createError) {
        if (createError.message.includes('already been registered')) {
          return new Response(
            JSON.stringify({ error: 'A user with this email already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Failed to create user', details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin.from('users').upsert({
        id: authData.user.id,
        email: direct_email,
        full_name: direct_name,
        role: direct_role,
      });

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Task Manager <onboarding@resend.dev>',
          to: direct_email,
          subject: 'Your Task Manager account has been created',
          html: `
            <div style="font-family:Arial,sans-serif;background:#f5f3ff;padding:40px 20px;">
              <div style="background:#fff;border-radius:16px;max-width:480px;margin:0 auto;padding:40px;">
                <div style="font-size:22px;font-weight:700;color:#6C3EB6;margin-bottom:20px;">Task Manager</div>
                <h1 style="font-size:20px;color:#1C1C1E;margin:0 0 12px;">Your account is ready</h1>
                <p style="font-size:15px;color:#6E6E73;line-height:1.6;margin:0 0 16px;">
                  Hi <strong>${direct_name}</strong>, your account has been created by your instructor.
                </p>
                <div style="background:#f5f3ff;border:1px solid #D8CDFF;border-radius:10px;padding:18px 20px;margin:20px 0;">
                  <p style="margin:0 0 10px;font-size:14px;"><strong style="color:#9B6DE3;">Email:</strong> ${direct_email}</p>
                  <p style="margin:0 0 10px;font-size:14px;"><strong style="color:#9B6DE3;">Password:</strong> <code style="background:#ede8ff;padding:2px 8px;border-radius:4px;">${tempPassword}</code></p>
                  <p style="margin:0;font-size:14px;"><strong style="color:#9B6DE3;">Role:</strong> ${direct_role}</p>
                </div>
                <a href="${siteUrl}/login" style="display:block;text-align:center;background:linear-gradient(135deg,#E56ACF,#6C3EB6);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;margin:8px 0 24px;">
                  Sign in to Task Manager
                </a>
                <p style="font-size:13px;color:#E56ACF;background:#fce8f8;border-radius:8px;padding:10px 14px;margin:0;">
                  Please change your password after your first login.
                </p>
              </div>
            </div>
          `,
        }),
      });

      return new Response(
        JSON.stringify({ success: true, message: `Account created and email sent to ${direct_email}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── APPROVAL FLOW ─────────────────────────────────────────────────
    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'request_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: request, error: fetchError } = await supabaseAdmin
      .from('account_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ error: 'Request not found', details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.status === 'approved') {
      return new Response(
        JSON.stringify({ error: 'Already approved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tempPassword = generatePassword();

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: request.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: request.full_name,
        role: request.role,
      },
    });

    if (createError) {
      if (createError.message.includes('already been registered')) {
        await supabaseAdmin
          .from('account_requests')
          .update({ status: 'approved' })
          .eq('id', request_id);

        return new Response(
          JSON.stringify({ success: true, message: 'User already exists. Request marked as approved.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to create user', details: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: request.email,
        full_name: request.full_name,
        role: request.role,
      });

    await supabaseAdmin
      .from('account_requests')
      .update({ status: 'approved' })
      .eq('id', request_id);

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Task Manager <onboarding@resend.dev>',
        to: request.email,
        subject: 'Your Task Manager account has been approved',
        html: `
          <div style="font-family:Arial,sans-serif;background:#f5f3ff;padding:40px 20px;">
            <div style="background:#fff;border-radius:16px;max-width:480px;margin:0 auto;padding:40px;box-shadow:0 4px 20px rgba(108,62,182,0.10);">
              <div style="font-size:22px;font-weight:700;color:#6C3EB6;margin-bottom:20px;">Task Manager</div>
              <h1 style="font-size:20px;color:#1C1C1E;margin:0 0 12px;">Your account is ready</h1>
              <p style="font-size:15px;color:#6E6E73;line-height:1.6;margin:0 0 16px;">
                Hi <strong>${request.full_name}</strong>, your account request has been approved.
                You can now sign in using the credentials below.
              </p>
              <div style="background:#f5f3ff;border:1px solid #D8CDFF;border-radius:10px;padding:18px 20px;margin:20px 0;">
                <p style="margin:0 0 10px;font-size:14px;color:#1C1C1E;">
                  <strong style="color:#9B6DE3;">Email:</strong>&nbsp;
                  <span style="font-family:monospace;">${request.email}</span>
                </p>
                <p style="margin:0 0 10px;font-size:14px;color:#1C1C1E;">
                  <strong style="color:#9B6DE3;">Temporary password:</strong>&nbsp;
                  <span style="font-family:monospace;background:#ede8ff;padding:2px 8px;border-radius:4px;">${tempPassword}</span>
                </p>
                <p style="margin:0;font-size:14px;color:#1C1C1E;">
                  <strong style="color:#9B6DE3;">Role:</strong>&nbsp;${request.role}
                </p>
              </div>
              <a href="${siteUrl}/login"
                 style="display:block;text-align:center;background:linear-gradient(135deg,#E56ACF,#6C3EB6);
                        color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;
                        font-size:15px;font-weight:600;margin:8px 0 24px;">
                Sign in to Task Manager
              </a>
              <p style="font-size:13px;color:#E56ACF;background:#fce8f8;border-radius:8px;padding:10px 14px;margin:0;">
                Please change your password after your first login for security.
              </p>
              <div style="font-size:12px;color:#D1D1D6;margin-top:28px;text-align:center;">
                Task Manager · Student Collaboration System · COSC498VI
              </div>
            </div>
          </div>
        `,
      }),
    });

    const emailData = await emailRes.json();
    console.log('Email send result:', emailRes.status, emailData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Account created and invitation sent to ${request.email}`,
        temp_password: tempPassword,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});