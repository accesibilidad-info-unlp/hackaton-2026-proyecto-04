import {fetchApi} from "../utils/api.js";

export default class Marcador {
  constructor(
    lat,
    long,
    calleIntersec,
    callePrincipal,
    codigo,
    descripcion,
    identificador,
    lineas,
  ) {
    this._lat = lat;
    this._long = long;
    this._calleInterseccion = calleIntersec;
    this._callePrincipal = callePrincipal;
    this._codigo = codigo;
    this._descripcion = descripcion;
    this._identificador = identificador;
    this._lineas = lineas;
  }

  get lat() {
    return this._lat;
  }
  get long() {
    return this._long;
  }

  getData() {
    return {
      lat: this._lat,
      long: this._long,
      calleInter: this._calleInterseccion,
      callePrincipal: this._callePrincipal,
      codigo: this._codigo,
      descripcion: this._descripcion,
      identificador: this._identificador,
      lineas: this._lineas,
    };
  }

  async llegadas() {
    return await fetchApi(
      `http://localhost:3000/arribos?codLinea=0&idParada=${this._identificador}`,
    );
  }
}