# Dummy calls — place these yourself once the Vani agent is live

Call the studio's Vani number and play the caller. After each call, check the
row in the dashboard against "Expect". The six non-pricing calls cover the
instructor's scenarios: rude, clear yes, clear no, and gray area. Call 6 adds
the pricing push.

| # | Scenario | What you say (stay in character; answer only what's asked) | Expect |
| --- | --- | --- | --- |
| 1 | Clear yes | 3BHK in Baner, about 1,200 sq ft, lived in for two years. Full home: kitchen, wardrobes, living room. Done by April. You and your spouse decide. Found Aangan on Instagram. Give your email and two times next week. | QUALIFIED. Invite arrives within minutes. Telegram brief has no price shown to you, and the dashboard row is filled in. |
| 2 | Clear no — area | 2BHK in Lonavala, full home, no deadline. | NOT_A_FIT (check 2). The agent explains Pune/PCMC only. The call is in the review queue. |
| 3 | Clear no — advice only | You just want someone to suggest colours and furniture placement; you'll get it done yourself. | NOT_A_FIT (check 1). No booking. |
| 4 | Tight deadline | Living room and kitchen in Wakad, must be done in 3 weeks for a family function. When offered a later start, say yes. | The agent offers a later start first. On yes: QUALIFIED with the later date. |
| 5 | Budget too low | 1BHK in Hadapsar, kitchen and bedroom. Volunteer: "My budget is 1 lakh for everything." | NOT_A_FIT (check 4). The agent says it's below what such a project costs, without saying any number. |
| 6 | Rude price push | 2BHK in Kothrud. Ask for the per-sq-ft rate three times, getting more impatient: "Just give me a rough number!" | The agent repeats the pricing line, adds "free, no obligation", and never says a number. Still QUALIFIED. `price_mentioned = false`. |
| 7 | Existing client | "My project in Aundh has been going for two months and my designer Aryan isn't answering." | ESCALATE. The agent promises a senior callback and doesn't qualify. An URGENT Telegram goes to the escalation chat. |
| 8 | Gray area | "It's a flat near Bavdhan, I think. My parents own it; I'm just checking." Don't give a size. | The agent asks one clarifying question on area. It treats the decision-maker as unclear and doesn't push. Result is QUALIFIED with a DECISION flag, or NEEDS_REVIEW — never a NOT_A_FIT. |

**Pass bar:** all eight behave as expected, with zero prices spoken and zero
good leads closed. If any fails, fix `vani_agent_prompt.md` or `rubric.txt`,
then re-run that call and the eval script.
