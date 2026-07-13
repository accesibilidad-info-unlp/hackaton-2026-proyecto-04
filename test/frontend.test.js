import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCodigoLinea, getCodigoLineaPredeterminado } from "../src/js/lineas.js";
import { savePosition, getPosition } from "../src/js/position/position.js";
import Marcador from "../src/js/clases/Marker.js";
import { fetchApi } from "../src/js/utils/api.js";

// Mock para api.js
vi.mock("../src/js/utils/api.js", () => ({
  fetchApi: vi.fn(),
}));

// Mock para localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

global.localStorage = mockLocalStorage;

// Mock para navigator.geolocation e inyeccion de funciones globales
global.alert = vi.fn();
Object.defineProperty(global, "navigator", {
  value: {
    geolocation: {
      getCurrentPosition: vi.fn(),
    },
  },
  configurable: true,
  writable: true,
});

describe("Frontend Lineas Utility", () => {
  it("getCodigoLinea devuelve el codigo o numero correcto de la linea", () => {
    expect(getCodigoLinea({ codigo: "202" })).toBe("202");
    expect(getCodigoLinea({ numero: "214" })).toBe("214");
    expect(getCodigoLinea(null)).toBe("");
  });

  it("getCodigoLineaPredeterminado devuelve linea 307 prioritariamente", () => {
    const lineas = [
      { codigo: "202" },
      { codigo: "307" },
      { codigo: "214" },
    ];
    expect(getCodigoLineaPredeterminado(lineas)).toBe("307");
  });

  it("getCodigoLineaPredeterminado devuelve la primera linea si no esta la 307", () => {
    const lineas = [
      { codigo: "202" },
      { codigo: "214" },
    ];
    expect(getCodigoLineaPredeterminado(lineas)).toBe("202");
  });

  it("getCodigoLineaPredeterminado devuelve vacio si la lista esta vacia", () => {
    expect(getCodigoLineaPredeterminado([])).toBe("");
    expect(getCodigoLineaPredeterminado(null)).toBe("");
  });
});

describe("Frontend Position Utility", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  it("savePosition guarda correctamente la ubicacion si el usuario la concede", async () => {
    const mockUbicacionCoords = {
      coords: {
        latitude: -34.92,
        longitude: -57.95,
      },
    };

    // Simulamos que getCurrentPosition llama a la funcion de exito
    global.navigator.geolocation.getCurrentPosition.mockImplementationOnce((exito) => {
      exito(mockUbicacionCoords);
    });

    const resultado = await savePosition();

    expect(resultado.lat).toBe(-34.92);
    expect(resultado.lon).toBe(-57.95);
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it("savePosition rechaza si hay un error de geolocalizacion", async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      PERMISSION_DENIED: 1,
      message: "User denied Geolocation",
    };

    global.navigator.geolocation.getCurrentPosition.mockImplementationOnce((exito, error) => {
      error(mockError);
    });

    await expect(savePosition()).rejects.toEqual(mockError);
    expect(global.alert).toHaveBeenCalledWith(
      "Necesitamos tu ubicación para mostrar el mapa. Por favor, actívala en tu navegador."
    );
  });

  it("getPosition recupera la ubicacion guardada de localStorage", () => {
    mockLocalStorage.setItem(
      "user_location",
      JSON.stringify({ lat: -34.92, lon: -57.95 })
    );

    const pos = getPosition();
    expect(pos).toEqual({ lat: -34.92, lon: -57.95 });
  });

  it("getPosition devuelve null si no hay ubicacion guardada", () => {
    const pos = getPosition();
    expect(pos).toBeNull();
  });
});

describe("Frontend Marcador Class", () => {
  it("El constructor y getData devuelven los valores esperados", () => {
    const marker = new Marcador(
      -34.92,
      -57.95,
      "50",
      "7",
      "1001",
      "Parada 7 y 50",
      "P202-001",
      ["202"]
    );

    expect(marker.lat).toBe(-34.92);
    expect(marker.long).toBe(-57.95);

    const data = marker.getData();
    expect(data.identificador).toBe("P202-001");
    expect(data.callePrincipal).toBe("7");
    expect(data.lineas).toEqual(["202"]);
  });

  it("llegadas hace una peticion a la API usando fetchApi con su identificador", async () => {
    const marker = new Marcador(
      -34.92,
      -57.95,
      "50",
      "7",
      "1001",
      "Parada 7 y 50",
      "P202-001",
      ["202"]
    );

    vi.mocked(fetchApi).mockResolvedValueOnce({
      idParada: "P202-001",
      arribos: [],
    });

    const infoLlegadas = await marker.llegadas();
    expect(fetchApi).toHaveBeenCalledWith(
      "http://localhost:3000/arribos?codLinea=0&idParada=P202-001"
    );
    expect(infoLlegadas.idParada).toBe("P202-001");
  });
});
