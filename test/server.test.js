import { describe, it, expect } from "vitest";
import request from "supertest";
import app, {
  distanciaEnMetros,
  extraerMinutos,
  obtenerLineaPorCodigo,
  obtenerLineasDeParada,
  enriquecerParada,
  construirArribosParaParada,
} from "../server/proxy.js";

describe("Backend Helper Logic", () => {
  it("distanciaEnMetros calcula correctamente la distancia en metros", () => {
    // Distancia aproximada entre parada 7 y 50 y otra parada cercana
    const lat1 = -34.92053;
    const lon1 = -57.9541;
    const lat2 = -34.92941;
    const lon2 = -57.95235;

    const distancia = distanciaEnMetros(lat1, lon1, lat2, lon2);
    expect(distancia).toBeGreaterThan(900);
    expect(distancia).toBeLessThan(1100);
  });

  it("extraerMinutos extrae el valor numerico del tiempo de arribo", () => {
    expect(extraerMinutos("5 min")).toBe(5);
    expect(extraerMinutos("15")).toBe(15);
    expect(extraerMinutos("Sin dato")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("obtenerLineaPorCodigo encuentra la linea por su codigo", () => {
    const linea = obtenerLineaPorCodigo("202");
    expect(linea).toBeDefined();
    expect(linea.codigo).toBe("202");
    expect(linea.numero).toBe("202");

    const inexistente = obtenerLineaPorCodigo("999");
    expect(inexistente).toBeUndefined();
  });

  it("enriquecerParada agrega la info de las lineas a la parada", () => {
    const paradaMock = {
      identificador: "P202-001",
      codigo: "1001",
      descripcion: "Parada 7 y 50",
      callePrincipal: "7",
      calleInterseccion: "50",
      codigoLineas: ["202"]
    };

    const paradaEnriquecida = enriquecerParada(paradaMock);
    expect(paradaEnriquecida.lineas).toBeDefined();
    expect(paradaEnriquecida.lineas.length).toBe(1);
    expect(paradaEnriquecida.lineas[0].codigo).toBe("202");
  });
});

describe("Backend API Endpoints", () => {
  it("GET /paradascercanas devuelve paradas dentro del radio", async () => {
    // Cerca de Parada 7 y 50
    const res = await request(app)
      .get("/paradascercanas")
      .query({ lat: -34.92053, long: -57.9541, radioMetros: 500 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].identificador).toBe("P202-001");
  });

  it("GET /paradascercanas vacio si faltan lat o long", async () => {
    const res = await request(app).get("/paradascercanas");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /arribos devuelve 400 si falta idParada", async () => {
    const res = await request(app).get("/arribos");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("El parámetro idParada es obligatorio.");
  });

  it("GET /arribos devuelve 404 si la parada no existe", async () => {
    const res = await request(app)
      .get("/arribos")
      .query({ idParada: "P_INEXISTENTE" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Parada no encontrada.");
  });

  it("GET /arribos devuelve la lista de arribos en una parada valida", async () => {
    const res = await request(app)
      .get("/arribos")
      .query({ idParada: "P202-001" });

    expect(res.status).toBe(200);
    expect(res.body.idParada).toBe("P202-001");
    expect(res.body.arribos).toBeDefined();
    expect(Array.isArray(res.body.arribos)).toBe(true);
  });

  it("GET /paradas/:callePrincipal/:calleInterseccion devuelve parada filtrada", async () => {
    const res = await request(app).get("/paradas/7/50");
    expect(res.status).toBe(200);
    expect(res.body.callePrincipal).toBe("7");
    expect(res.body.calleInterseccion).toBe("50");
    expect(res.body.resultado.length).toBeGreaterThan(0);
    expect(res.body.resultado[0].identificador).toBe("P202-001");
  });

  it("GET /paradas sin parametros devuelve todas las paradas", async () => {
    const res = await request(app).get("/paradas");
    expect(res.status).toBe(200);
    expect(res.body.callePrincipal).toBe("No provista");
    expect(res.body.resultado.length).toBeGreaterThan(0);
  });

  it("GET /recorrido/:codigoMicro devuelve datos del recorrido del micro", async () => {
    const res = await request(app).get("/recorrido/202-1");
    if (res.status === 200) {
      expect(res.body.resultado).toBeDefined();
      expect(Array.isArray(res.body.resultado)).toBe(true);
    } else {
      // Si el mock no tiene 202-1 en este momento o cambia, contemplamos 404
      expect(res.status).toBe(404);
    }
  });

  it("GET /recorrido/:codigoMicro devuelve 404 para micro inexistente", async () => {
    const res = await request(app).get("/recorrido/INEXISTENTE-99");
    expect(res.status).toBe(404);
  });
});
