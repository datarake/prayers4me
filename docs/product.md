# Product

## The idea

People go through bad times — sometimes quietly desperate. They can write a short note or a fuller story. Other people can pray for that story. Each prayer increments a count (similar to a like on social apps). The person who asked does not see *who* prayed — only *how many*.

That anonymity is intentional. The meaning is presence: knowing that somewhere in the world, someone held you in prayer. One prayer can be enough to feel less alone and to find a bit of strength again.

## Principles

1. **Presence without intimacy** — Support without forcing conversation or public identity.
2. **Even one matters** — The product should celebrate the first prayer as much as the hundredth.
3. **Ask and pray are equal** — Two clear intents: need prayer, give prayer.
4. **Quiet by default** — No social graph, no chat threads, no scripture library as a feed.
5. **Language-scoped community** — People pray in the language they chose; feeds stay in that channel.
6. **Human stories, not dumps** — Personal situations over pasted religious text or spam.
7. **Trust is product** — Moderation is not an afterthought; feed health is part of the experience.
8. **Low friction in crisis** — Asking for prayer should not require a heavy signup flow.

## Core user journeys

### Ask for prayer (“for me”)

1. Choose language (if needed).
2. Write a name (or how you want to be called) and a message.
3. Optionally allow contact (phone / email).
4. Send the request into the language feed.
5. See your requests and the prayer count grow over time.

### Pray for someone (“for others”)

1. Open the feed in your language.
2. Read a person’s story.
3. Tap **I prayed** once per request.
4. Optionally report harmful or spam content.

## Features (MVP)

| Area | What ships |
|------|------------|
| Welcome | Brand, short explanation, clear paths: ask / pray / language |
| Languages | EN, ES, FR, RO, UK, RU (Russian last in the picker) |
| For others | Language feed, pray once, report |
| For me | My requests, compose ask, prayer counts |
| Moderation | Rate limits, reports, auto-hide threshold, admin hide/ban |
| Clients | Expo mobile (iOS/Android); web peer planned on Next.js |

## Explicit non-goals (v1)

- Public profiles or follower graphs  
- Comment threads or group chat  
- Built-in Bible / scripture browser as primary content  
- Ranking by popularity alone (chronological language feed first)  
- Required social login before asking for prayer  

## Copy tone

Calm, direct, hopeful. Avoid performance spirituality and avoid sounding like a noisy social network. Prefer short sentences that a stressed person can read quickly.

**Tagline direction:** *Someone prayed for you.*

## Why moderation is part of the product story

An earlier version of this idea attracted organic use, then collapsed when one person flooded every language channel with long religious texts and there was no ban/report path. Prayers4me treats that as a product requirement: rate limits, report reasons (including scripture dumps), auto-hide after enough reports, and admin tools — from day one.
