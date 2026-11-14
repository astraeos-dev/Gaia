## Sous Windows

Téléchargez le programme d'installation `Celeste-<version>-Setup.exe` de la [dernière version](https://github.com/astraeos-dev/Celeste_App/releases/latest), puis lancez-le : il crée les raccourcis du menu Démarrer et du Bureau, et Céleste se désinstalle depuis les paramètres de Windows.

- **Premier lancement** : Céleste télécharge une seule fois l'éphéméride JPL DE440 (32 Mo) dans le dossier `.celeste` de votre profil. Il faut une connexion Internet ce jour-là ; ensuite tout fonctionne hors ligne.
- **SmartScreen** : le programme d'installation n'est pas encore signé. Au premier lancement, Windows affiche « Windows a protégé votre ordinateur » : *Informations complémentaires*, puis *Exécuter quand même*. La signature gratuite de SignPath Foundation est demandée.
- **Mises à jour** : Céleste cherche une nouvelle version au démarrage (ou par Réglages › À propos › Vérifier les mises à jour), la télécharge, vérifie son empreinte SHA-256, l'installe par-dessus l'ancienne et se rouvre, réglages et favoris conservés. Une mise à jour pèse environ 80 Mo : l'éphéméride n'est pas retéléchargée.
- **Versions de test** : chaque changement en cours de développement publie une bêta (« 4.24 bêta 32 ») sur la page des versions. La mise à jour automatique ne propose jamais une bêta.

Si une mise à jour ne s'installe pas, son journal est dans `%TEMP%\Celeste-update\install.log` ; si elle ne se télécharge pas, chaque tentative est notée dans `update.log`, dans le même dossier.

## Depuis les sources (Windows, macOS, Linux)

Il faut Python 3.10 ou plus récent. PySide6 apporte Qt ; sur un Linux minimal, Qt demande aussi quelques bibliothèques (`sudo apt install libegl1 libxkbcommon0` sur Debian ou Ubuntu).

```bash
git clone https://github.com/astraeos-dev/Celeste_App.git
cd Celeste_App
pip install -r requirements.txt
python main.py
```

Options : `--lang fr` (ou `en`, `es`, `de`) pour la langue, `--theme jour` (ou `nuit`, `observation`) pour le thème. Sans option, la langue suit celle du système et le thème est Nuit ; les deux se changent ensuite sans redémarrer.

## Sur Android

L'alpha de la version 5 est construite à chaque changement par l'intégration continue (APK arm64 et x86_64) et vérifiée sur un émulateur Android 14. Elle n'est pas encore publiée : la version 5 vise Google Play.

## Utilisation

| Champ | Rôle |
|---|---|
| **Date et heure** | `JJ/MM/AAAA HH:MM:SS`, en temps universel ; la flèche ouvre un calendrier, l'horloge revient à l'instant présent |
| **Lieu** | Le nom d'une ville, choisi parmi les suggestions ; remplit la latitude, la longitude et l'altitude |
| **Latitude, longitude** | En degrés décimaux, positifs au nord et à l'est (`48,85` et `2,35` pour Paris) ; la carte choisit un point, la cible demande la position de l'appareil |
| **Fuseau** | Le fuseau IANA des heures affichées ; « Automatique » suit le lieu |
| **Favoris** | Choisir un lieu l'applique ; l'étoile ajoute le lieu saisi, la corbeille supprime le favori choisi |

- **Calculer** (`F5`) lance les calculs ; **Suivre en temps réel** (`Ctrl+L`) suit l'heure tant que le bouton reste enfoncé ; **Historique** (`Ctrl+H`) rappelle un calcul passé.
- Sur la carte du ciel, survolez un astre pour le reconnaître, cliquez pour sa fiche ; la molette zoome, un glisser déplace la carte ; la barre du dessous montre le ciel à une autre heure de la nuit.
- Un évènement est **visible d'ici** quand l'astre est à plus de 5° de hauteur alors que le Soleil est à plus de 6° sous l'horizon (12° pour les planètes mineures plus faibles), la nuit de l'évènement.
- Un passage de satellite compte quand il monte à plus de 10°, éclairé par le Soleil, alors que le Soleil est à plus de 6° sous l'horizon, pendant au moins 30 secondes.
- Pour l'**Atelier**, imprimez à 100 % et vérifiez la règle de 100 mm de chaque page.
