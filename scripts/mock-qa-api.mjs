import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.QA_MOCK_API_PORT || 4100);

const marketingOverview = {
  authStats: [
    { label: 'Properties managed', value: '12,000+' },
    { label: 'Rent collected', value: '₦4.2B+' },
    { label: 'Platform uptime', value: '98.3%' },
    { label: 'Active landlords', value: '5,200+' },
  ],
  authActivity: [
    {
      title: 'Rent received',
      subtitle: 'Chidinma Eze · ₦320,000',
      time: '2m ago',
      tone: 'success',
    },
    {
      title: 'Agreement signed',
      subtitle: 'Kelechi Dike · Unit B2, Lekki',
      time: '18m ago',
      tone: 'gold',
    },
  ],
};

const workspaces = {
  'lekki.localhost': {
    id: 'ws_lekki',
    companyName: 'Lekki Property Holdings Ltd',
    workspaceMode: 'PROPERTY_MANAGER_COMPANY',
    workspaceSlug: 'lekki',
    publicSupportEmail: 'ops@lekki.io',
    publicSupportPhone: '+2348012345678',
    publicLegalAddress: 'Lekki Phase 1, Lagos',
    branding: {
      displayName: 'Lekki Property Holdings Ltd',
      logoUrl: 'https://example.com/assets/lekki-logo.png',
      loginBackgroundUrl: 'https://example.com/assets/lekki-login-bg.jpg',
      primaryColor: '#8A1538',
      accentColor: '#C8A45A',
    },
  },
  'abuja.localhost': {
    id: 'ws_abuja',
    companyName: 'Abuja Prime Estates',
    workspaceMode: 'PROPERTY_MANAGER_COMPANY',
    workspaceSlug: 'abuja',
    publicSupportEmail: 'hello@abujaprime.com',
    publicSupportPhone: '+2348099999999',
    publicLegalAddress: 'Wuse II, Abuja',
    branding: {
      displayName: 'Abuja Prime Estates',
      logoUrl: 'https://example.com/assets/abuja-logo.png',
      loginBackgroundUrl: 'https://example.com/assets/abuja-login-bg.jpg',
      primaryColor: '#0E5A8A',
      accentColor: '#D7A63C',
    },
  },
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-workspace-host',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${PORT}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-workspace-host',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    response.end();
    return;
  }

  if (url.pathname === '/healthz') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/marketplace/public-overview') {
    sendJson(response, 200, {
      success: true,
      data: marketingOverview,
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/auth/workspace') {
    const host = (url.searchParams.get('host') || '').toLowerCase();
    const workspace = workspaces[host] ?? null;

    sendJson(response, 200, {
      success: true,
      data: {
        workspace,
      },
    });
    return;
  }

  if (
    request.method === 'POST' &&
    url.pathname === '/api/v1/marketplace/enterprise-onboarding-request'
  ) {
    let rawBody = '';
    request.setEncoding('utf8');

    request.on('data', (chunk) => {
      rawBody += chunk;
    });

    request.on('end', () => {
      let parsedBody = {};

      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        sendJson(response, 400, {
          success: false,
          message: 'Invalid JSON payload.',
        });
        return;
      }

      sendJson(response, 200, {
        success: true,
        message: `Enterprise onboarding request sent successfully for ${
          parsedBody.companyName || 'your company'
        }.`,
        data: {
          requestId: 'req_enterprise_local',
        },
      });
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: `Mock QA API route not found: ${request.method} ${url.pathname}`,
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock QA API listening on http://127.0.0.1:${PORT}`);
});
