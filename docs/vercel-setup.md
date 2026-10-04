# Configuration Vercel × Supabase

## Environnements

```
branche main        →  Vercel Production  →  Supabase « Hotel PMS » (gqbztdprvqwewivzebsa)
branche develop     →  Vercel Preview     →  Supabase « Hotel PMS »
branches de PR      →  Vercel Preview     →  Supabase « Hotel PMS »
développement local →  .env.local         →  Supabase « Hotel PMS »
```

Un seul projet Supabase pour l'instant, comme Sénémap. Avant le premier hôtel réel,
créer un projet distinct pour les previews (ou activer le branching Supabase) afin que les
tests ne touchent jamais les données d'exploitation.

## Variables à définir

Vercel → projet `hotel-pms` → Settings → Environment Variables, cibles Production et Preview :

| Variable | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://gqbztdprvqwewivzebsa.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | clé anon (ou publishable) du projet, Supabase → Project Settings → API Keys |

Redéployer après l'ajout : les variables `VITE_` sont lues à la compilation.

## Supabase Auth

Supabase → Authentication → URL Configuration :

- Site URL : `https://hotel-pms-mu.vercel.app`
- Redirect URLs : `https://hotel-pms-mu.vercel.app/**`, `https://hotel-pms-*.vercel.app/**`,
  `http://localhost:5173/**`

Sans cela, les liens de confirmation et de réinitialisation renvoient vers la mauvaise adresse.

## Région

Le projet Supabase est en eu-west-1. Les fonctions Vercel (aucune pour l'instant) devront
être placées dans une région proche (`cdg1` ou `dub1`) plutôt que `iad1`.
