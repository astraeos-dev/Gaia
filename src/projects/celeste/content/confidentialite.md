Céleste n'a ni compte, ni statistiques d'usage, ni publicité. Ses réglages, favoris, historique et journal d'observation restent dans le dossier `.celeste` de votre ordinateur. Elle se connecte aux services suivants, et à aucun autre :

| Service | Quand | Ce qu'il reçoit |
|---|---|---|
| NASA JPL (naif.jpl.nasa.gov) | au premier lancement : l'éphéméride DE440 | une demande de téléchargement ordinaire |
| GitHub (api.github.com, github.com) | au démarrage, pour chercher une nouvelle version (désactivable dans Réglages › À propos) | une demande ordinaire avec la version de Céleste |
| Minor Planet Center, CelesTrak, AMSAT | quand les orbites des comètes ou des satellites sont périmées | une demande de téléchargement ordinaire |
| NASA JPL (ssd-api.jpl.nasa.gov, ssd.jpl.nasa.gov) | à l'ouverture de la page des géocroiseurs : la liste des passages (deux fois par jour au plus), et la position des rares qui peuvent être brillants (une fois par jour) | le nom de l'astéroïde ; pas le lieu |
| asteroidoccultation.com | à l'ouverture de la page des occultations : les prédictions de l'IOTA de l'année (une fois par mois au plus) | une demande de téléchargement ordinaire |
| rochesterastronomy.org, asd.gsfc.nasa.gov | à l'ouverture de la page des novae et supernovae : les deux listes (deux fois par jour au plus) | une demande de téléchargement ordinaire |
| Open-Meteo (api.open-meteo.com) | seulement quand vous activez la prévision des nuages (bouton nuage de Ce soir), une fois par heure au plus | la latitude et la longitude du lieu |
| OpenStreetMap (tile.openstreetmap.org, nominatim.openstreetmap.org) | seulement quand vous ouvrez la carte du lieu, ou demandez votre position (le bouton) | la zone de carte affichée ; le point choisi ou votre position, au centième de degré (environ un kilomètre), pour nommer la ville |
| ipwho.is, ipapi.co, ip-api.com | seulement quand vous demandez votre position et que le système ne peut pas la donner | votre adresse IP, qu'ils traduisent en lieu approximatif |

Chaque demande part directement vers ces services : Céleste n'envoie rien à ses auteurs. Sur un téléphone, la position trouvée au démarrage (avec la permission d'Android) reste sur le téléphone : la ville est nommée d'après la liste que Céleste emporte.

## Signature du code

La signature gratuite du code est fournie par [SignPath.io](https://about.signpath.io), avec un certificat de [SignPath Foundation](https://signpath.org), une fois le projet accepté ; d'ici là, le programme d'installation Windows n'est pas signé.

- Auteurs et relecteurs : [les mainteneurs du dépôt](https://github.com/astraeos-dev/Celeste_App/graphs/contributors) ; les changements d'autres contributeurs sont relus dans une demande de fusion avant d'être intégrés.
- Approbateur : [astraeos-dev](https://github.com/astraeos-dev), qui approuve chaque version avant sa signature.
- Ce qui est signé : le programme d'installation `Celeste-<version>-Setup.exe`, construit depuis les sources du dépôt par le workflow *Build* de GitHub Actions ; rien de ce qui est construit ailleurs.

## Licence

Céleste est distribué sous licence MIT. Les polices sont sous licence SIL Open Font License 1.1, les icônes Material Design sous licence Apache 2.0.
