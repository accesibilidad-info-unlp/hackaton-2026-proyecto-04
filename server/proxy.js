import express from 'express'
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

async function fetchConCSRF(url, bodyParams) {
  const pageRes = await fetch(url);
  const rawCookies = pageRes.headers.get('set-cookie');

  console.log('Raw cookies:', rawCookies);

  const cookies = rawCookies
    ?.split(',')
    .map(c => c.split(';')[0].trim())
    .filter(c => c.includes('='))
    .join('; ');

  console.log('Cookies procesadas:', cookies);

  const html = await pageRes.text();
  const token = html.match(/name="CSRF-TOKEN-CL-FORM"[^>]*value="([^"]+)"/)?.[1]
    || html.match(/value="([^"]+)"[^>]*name="CSRF-TOKEN-CL-FORM"/)?.[1];

  console.log('Token:', token ? token.substring(0, 20) + '...' : 'NO ENCONTRADO');

  const apiRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'RequestVerificationToken': token ?? '',
      'Referer': url,
      'Origin': 'https://cuandollega.smartmovepro.net',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(bodyParams),
  });

  console.log('Status:', apiRes.status);
  const text = await apiRes.text();
  console.log('Respuesta:', text.substring(0, 300));
  return { status: apiRes.status, text };
}

app.get('/arribos', async (req, res) => {
  const { codLinea, idParada } = req.query;
  console.log(`Consultando codLinea=${codLinea} idParada=${idParada}`);
  try {
    const baseUrl = `https://cuandollega.smartmovepro.net/unionplatense/arribos/`;
    const urlConParams = `${baseUrl}?codLinea=${codLinea}&idParada=${idParada}`;

    // GET a la URL base sin params para obtener cookies y token
    const pageRes = await fetch(baseUrl);
    const rawCookies = pageRes.headers.get('set-cookie');
    console.log('Raw cookies:', rawCookies);
    const cookies = rawCookies
      ?.split(',')
      .map(c => c.split(';')[0].trim())
      .filter(c => c.includes('='))
      .join('; ');
    const html = await pageRes.text();
    const token = html.match(/name="CSRF-TOKEN-CL-FORM"[^>]*value="([^"]+)"/)?.[1]
      || html.match(/value="([^"]+)"[^>]*name="CSRF-TOKEN-CL-FORM"/)?.[1];
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'NO ENCONTRADO');

    // POST a la URL CON params (como hace el sitio real)
    const apiRes = await fetch(urlConParams, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'RequestVerificationToken': token ?? '',
        'Referer': urlConParams,
        'Origin': 'https://cuandollega.smartmovepro.net',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ codLinea, idParada }),
    });

    console.log('Status:', apiRes.status);
    const text = await apiRes.text();
    console.log('Respuesta:', text.substring(0, 300));
    res.status(apiRes.status).send(text);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/paradascercanas', async (req, res) => {
  const { lat, long } = req.query;
  console.log(`Consultando paradas cercanas lat=${lat} long=${long}`);
  try {
    const url = `https://cuandollega.smartmovepro.net/unionplatense/paradascercanas`;
    const { status, text } = await fetchConCSRF(url, { latitud: parseFloat(lat), longitud: parseFloat(long) });
    res.status(status).send(text);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Proxy corriendo en http://localhost:3000'));
