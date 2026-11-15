# Service de traduction NovaGen

`studio-translate.js` est la fonction à installer dans `api/studio-translate.js` du dépôt NovaGen, avec `maxDuration: 60` dans son `vercel.json`. Elle utilise la clé Anthropic déjà configurée côté NovaGen et vérifie la session et l'accès au projet NovaStudio avant chaque appel. NovaStudio appelle ce service via son propre proxy authentifié.

Cette copie sert à relire l'intégration et à retrouver la version compatible ; la fonction doit être déployée sur NovaGen avant d'activer la fonctionnalité dans NovaStudio.
