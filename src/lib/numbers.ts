const UNIDADES = [
  "",
  "un",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];

const DECENAS = [
  "",
  "",
  "",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

function groupToWords(n: number, apocope = false): string {
  if (n === 0) return "";
  if (n === 100) return "cien";

  const c = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];

  if (c > 0) parts.push(CENTENAS[c]);

  if (rest > 0) {
    if (rest < 30) {
      let word = UNIDADES[rest];
      if (apocope && rest === 21) word = "veintiún";
      if (apocope && rest === 1) word = "un";
      parts.push(word);
    } else {
      const d = Math.floor(rest / 10);
      const u = rest % 10;
      let word = DECENAS[d];
      if (u > 0) {
        word += ` y ${u === 1 && apocope ? "un" : UNIDADES[u]}`;
      }
      parts.push(word);
    }
  }

  return parts.filter(Boolean).join(" ");
}

export function numeroALetras(valor: number): string {
  const n = Math.round(Math.abs(valor));
  if (n === 0) return "cero guaraníes";

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const unidades = n % 1000;

  const parts: string[] = [];

  if (millones > 0) {
    if (millones === 1) {
      parts.push("un millón");
    } else {
      parts.push(`${groupToWords(millones, true)} millones`);
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      parts.push("mil");
    } else {
      parts.push(`${groupToWords(miles, true)} mil`);
    }
  }

  if (unidades > 0) {
    parts.push(groupToWords(unidades, true));
  }

  const letras = parts.join(" ").replace(/\s+/g, " ").trim();
  const needsDe = millones > 0 && miles === 0 && unidades === 0;
  return `${letras}${needsDe ? " de" : ""} ${n === 1 ? "guaraní" : "guaraníes"}`;
}

export function numeroALetrasMayusculas(valor: number): string {
  return numeroALetras(valor).toUpperCase();
}
