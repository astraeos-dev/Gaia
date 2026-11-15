import { fmt } from '../../../lib/format'
import { Row } from '../components/InfoCard'
import SmallBodyPage from './SmallBodyPage'
import { getComet } from './sky'

const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const fromIso = (iso) => new Date(`${iso}T12:00:00`)

/** La fiche d'une comète : la dernière magnitude observée (COBS) et les pics d'éclat prévus. */
export default function CometPage({ id }) {
  const comet = getComet(id)
  return (
    <SmallBodyPage
      body={comet}
      back={{ to: '/astronomie/cometes', label: 'Toutes les comètes' }}
      missing="Cette comète n’est plus dans la liste : elle n’a pas été observée ces 30 derniers jours, ou son adresse a changé."
      intro={(sky) =>
        [
          comet.observed
            ? `Dernière magnitude observée : ${fmt(comet.observed.mag, 1)} (${dayMonth.format(fromIso(comet.observed.date))}).`
            : 'Pas d’observation ces 30 derniers jours.',
          sky.mag != null && `Magnitude prévue à l’instant choisi : ${fmt(sky.mag, 1)}.`,
          comet.aka && `Aussi désignée ${comet.aka}.`,
        ]
          .filter(Boolean)
          .join(' ')
      }
      nightExtra={
        comet && (
          <>
            {comet.cobs?.peak != null && comet.cobs.peakDate && (
              <Row label="Pic prévu par COBS" value={fmt(comet.cobs.peak, 1)} sub={dayMonthYear.format(fromIso(comet.cobs.peakDate))} />
            )}
            {comet.predictedPeak && (
              <Row label="Pic prévu (MPC, 12 mois)" value={fmt(comet.predictedPeak.mag, 1)} sub={dayMonthYear.format(fromIso(comet.predictedPeak.date))} />
            )}
          </>
        )
      }
    />
  )
}
