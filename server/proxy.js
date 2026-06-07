import express from 'express'
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/arribos', async (req, res) => {
  const { codLinea, idParada } = req.query;
  console.log(`Consultando codLinea=${codLinea} idParada=${idParada}`);

  try {
    const url = `https://cuandollega.smartmovepro.net/unionplatense/arribos/?codLinea=${codLinea}&idParada=${idParada}`;

    // Paso 1: obtener el HTML y las cookies
    const pageRes = await fetch(url);
    const cookieHeader = pageRes.headers.get('set-cookie');
    const html = await pageRes.text();

    // Extraer token del input hidden CSRF-TOKEN-CL-FORM
    const token = html.match(/name="CSRF-TOKEN-CL-FORM"[^>]*value="([^"]+)"/)?.[1]
      || html.match(/value="([^"]+)"[^>]*name="CSRF-TOKEN-CL-FORM"/)?.[1];

    console.log('Token del form:', token ? 'SI' : 'NO - no encontrado en HTML');
    console.log('HTML snippet:', html.substring(0, 500));

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader?.split(',').map(c => c.split(';')[0]).join('; '),
        'RequestVerificationToken': token,
        'Referer': url,
        'Origin': 'https://cuandollega.smartmovepro.net',
      },
      body: JSON.stringify({ codLinea, idParada })
    });

    console.log('Status:', apiRes.status);
    const text = await apiRes.text();
    console.log('Respuesta:', text);
    res.send(text);

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
    const pageRes = await fetch(url);
    const cookieHeader = pageRes.headers.get('set-cookie');
    const html = await pageRes.text();

    const token = html.match(/name="CSRF-TOKEN-CL-FORM"[^>]*value="([^"]+)"/)?.[1]
      || html.match(/value="([^"]+)"[^>]*name="CSRF-TOKEN-CL-FORM"/)?.[1];

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader?.split(',').map(c => c.split(';')[0]).join('; '),
        'RequestVerificationToken': token,
        'Referer': url,
        'Origin': 'https://cuandollega.smartmovepro.net',
      },
      body: JSON.stringify({ latitud: parseFloat(lat), longitud: parseFloat(long) })
    });

    console.log('Status:', apiRes.status);
    const text = await apiRes.text();
    console.log('Respuesta:', text);
    res.send(text);

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
})

app.listen(3000, () => console.log('Proxy corriendo en http://localhost:3000'));
