/**
 * Couleurs des familles de signaux, communes aux brochages et aux schémas de câblage : les jetons de la charte
 * Astræos et leurs mélanges (tailwind.config.js), une teinte par famille, qui suivent le thème. La couleur double
 * toujours un libellé, jamais seule.
 */
export const GROUPS = {
  i2c: { label: 'I2C', fill: 'fill-lune', stroke: 'stroke-lune', bg: 'bg-lune' },
  uart: { label: 'UART', fill: 'fill-or-alerte', stroke: 'stroke-or-alerte', bg: 'bg-or-alerte' },
  adc: { label: 'Analogique', fill: 'fill-ok', stroke: 'stroke-ok', bg: 'bg-ok' },
  spi: { label: 'SPI', fill: 'fill-lune-alerte', stroke: 'stroke-lune-alerte', bg: 'bg-lune-alerte' },
  pwr: { label: 'Alimentation', fill: 'fill-alerte', stroke: 'stroke-alerte', bg: 'bg-alerte' },
  pwm: { label: 'PWM', fill: 'fill-lune-ok', stroke: 'stroke-lune-ok', bg: 'bg-lune-ok' },
  avoid: { label: 'À éviter ou démarrage', fill: 'fill-or', stroke: 'stroke-or', bg: 'bg-or' },
}

export const NEUTRAL = { fill: 'fill-night-400', stroke: 'stroke-night-400 dark:stroke-night-500' }

/** Trait d'un fil selon son signal (masse et signaux sans famille en gris). */
export const WIRE_STROKE = {
  pwr: GROUPS.pwr.stroke,
  i2c: GROUPS.i2c.stroke,
  spi: GROUPS.spi.stroke,
  uart: GROUPS.uart.stroke,
  adc: GROUPS.adc.stroke,
  pwm: GROUPS.pwm.stroke,
  gnd: 'stroke-night-900 dark:stroke-night-400',
  gpio: 'stroke-night-500 dark:stroke-night-300',
  i2s: 'stroke-night-500 dark:stroke-night-300',
}
