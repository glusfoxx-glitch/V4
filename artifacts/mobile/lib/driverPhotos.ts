const PHOTOS: Record<string, ReturnType<typeof require>> = {
  ALB: require("../assets/drivers/alb.png"),
  ALO: require("../assets/drivers/alo.png"),
  ANT: require("../assets/drivers/ant.png"),
  BEA: require("../assets/drivers/bea.png"),
  BOR: require("../assets/drivers/bor.png"),
  BOT: require("../assets/drivers/bot.png"),
  COL: require("../assets/drivers/col.png"),
  GAS: require("../assets/drivers/gas.png"),
  HAD: require("../assets/drivers/had.png"),
  HAM: require("../assets/drivers/ham.png"),
  HUL: require("../assets/drivers/hul.png"),
  LAW: require("../assets/drivers/law.png"),
  LEC: require("../assets/drivers/lec.png"),
  NOR: require("../assets/drivers/nor.png"),
  OCO: require("../assets/drivers/oco.png"),
  PER: require("../assets/drivers/per.png"),
  PIA: require("../assets/drivers/pia.png"),
  RUS: require("../assets/drivers/rus.png"),
  SAI: require("../assets/drivers/sai.png"),
  STR: require("../assets/drivers/str.png"),
  VER: require("../assets/drivers/ver.png"),
};

export function getLocalDriverPhoto(
  code: string,
): ReturnType<typeof require> | null {
  return PHOTOS[code?.toUpperCase()] ?? null;
}
