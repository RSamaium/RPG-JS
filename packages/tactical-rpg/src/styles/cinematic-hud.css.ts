/** CSS of the tactical battle (kept as a string so that it is installed by `installTacticalStyles`). */
export default `/* Contextual command stage. Artwork deliberately breaks out of the stage. */
.t-bottom{left:0;right:0;bottom:0;padding:0 30px 14px;isolation:isolate}
.t-bottom.has-character:before{content:"";position:absolute;z-index:-1;inset:35px 0 0;background:linear-gradient(110deg,color-mix(in srgb, var(--ink) 92%, transparent),color-mix(in srgb, var(--ink) 96%, transparent) 65%,color-mix(in srgb, var(--ink) 87%, transparent));border-top:1px solid color-mix(in srgb, color-mix(in srgb, var(--gold), black 20%) 36%, transparent);clip-path:polygon(0 0,76% 0,81% 24%,92% 24%,95% 36%,100% 36%,100% 100%,0 100%)}
.t-command-deck,.t-command-deck.is-idle{display:flex;justify-content:flex-end;align-items:flex-end;gap:30px;min-height:80px}
.t-bottom.has-character .t-command-deck{min-height:260px}
.t-actions{width: min(29vw,360px);padding:12px 0 4px;background:none;border:0;animation:command-rise .45s cubic-bezier(.16,1,.3,1) both}
.t-actions .t-section-title{margin-bottom:10px;font-size:10px;color:color-mix(in srgb, var(--gold), black 10%)}
.t-actions .t-section-title>small{font-size:8px}
.t-action-buttons{display:flex;flex-direction:column;gap:7px}
.t-action-buttons button{display:flex;flex-direction:row;align-items:center;gap:15px;text-align:left;min-height:53px;padding:9px 28px 9px 18px;border:1px solid color-mix(in srgb, var(--muted) 29%, transparent);border-radius:7px;background:linear-gradient(105deg,color-mix(in srgb, color-mix(in srgb, var(--ink), white 10%) 61%, transparent),color-mix(in srgb, var(--ink) 60%, transparent));position:relative;transition:transform .2s,background .2s,border-color .2s,box-shadow .2s;overflow:hidden}
.t-action-buttons button:before{content:"";position:absolute;left:0;top:0;bottom:0;width:52px;background:linear-gradient(135deg,color-mix(in srgb, color-mix(in srgb, var(--muted), white 35%) 8%, transparent),transparent);clip-path:polygon(0 0,100% 50%,0 100%)}
.t-action-buttons button:hover,.t-action-buttons button.active{transform:translateX(5px);background:linear-gradient(100deg,color-mix(in srgb, color-mix(in srgb, var(--gold), black 40%) 30%, transparent),var(--ink) 70%);border-color:var(--gold);box-shadow:0 0 15px color-mix(in srgb, color-mix(in srgb, var(--gold), black 10%) 15%, transparent),inset 0 0 12px color-mix(in srgb, color-mix(in srgb, var(--gold), black 10%) 6%, transparent)}
.t-action-buttons button>span{width:38px;text-align:center;font-size:29px;color:color-mix(in srgb, var(--muted), white 50%);line-height:1}
.t-action-buttons button.active>span{color:color-mix(in srgb, var(--gold), white 30%)}
.t-action-buttons button>div{display:flex;flex-direction:column;gap:4px}
.t-action-buttons button strong{font:18px var(--rpg-ui-font-display);letter-spacing:.4px;color:var(--cream);font-weight:normal}
.t-action-buttons button small{font-size:10px;color:color-mix(in srgb, var(--muted), white 35%);font-weight:normal}
.t-action-buttons button kbd{left:auto;right:8px;top:8px;font-size:8px;opacity:.45}
.t-action-buttons button i{position:absolute;right:11px;bottom:9px;font-size:10px;color:var(--gold)}
.t-action-detail{display:none}
.t-order{width:185px;min-height:90px;padding:0 0 24px;background:none;border:0;flex-shrink:0}
.t-phase-button,.t-order .t-gold-button{min-height:56px;font:19px var(--rpg-ui-font-display);border:1px solid color-mix(in srgb, var(--gold), black 5%);outline:1px solid color-mix(in srgb, color-mix(in srgb, var(--gold), black 25%) 47%, transparent);outline-offset:4px;background:linear-gradient(105deg,color-mix(in srgb, color-mix(in srgb, var(--gold), black 40%) 19%, transparent),var(--ink));box-shadow:inset 0 0 16px color-mix(in srgb, color-mix(in srgb, var(--gold), black 20%) 7%, transparent)}
.t-order .t-gold-button{color:color-mix(in srgb, var(--gold), white 55%)!important}
.t-order>small{margin-top:19px;letter-spacing:3px;font-size:8px}
.t-order .t-text-button{margin-top:13px}
.t-hint{position:relative;margin:0 auto 5px;width:max-content;max-width:90%;font-size:10px;border:0;background:linear-gradient(90deg,transparent,color-mix(in srgb, var(--ink) 92%, transparent) 15%,color-mix(in srgb, var(--ink) 92%, transparent) 85%,transparent);padding:9px 35px}
.t-bottom.has-character .t-hint{margin-left:auto;margin-right:0}
.t-footnote{margin-top:8px;font-size:7px;opacity:.5}
.t-unit-detail,.t-unit-detail.enemy{position:absolute;left:0;top:auto;bottom:20px;width:49%;height:260px;display:flex;align-items:flex-end;background:none;border:0;overflow:visible;z-index:5;pointer-events:none;animation:none}
.t-detail-art,.t-unit-detail.enemy .t-detail-art{width:48%;height:360px;background:none;overflow:visible;position:relative;flex-shrink:0;animation:portrait-slide .6s cubic-bezier(.16,1,.3,1) both}
.t-portrait{left:0;top:0;width:100%;height:100%;background-repeat:no-repeat;filter:none!important;mask-image:linear-gradient(90deg,#000 70%,transparent),linear-gradient(0deg,#000 85%,transparent);mask-composite:intersect}
.t-detail-art.illustrated .t-portrait{mask-image:radial-gradient(ellipse 90% 85% at 44% 67%,#000 55%,transparent 83%);mask-composite:add}
.t-unit-detail.enemy .t-detail-art{height:360px;width:48%;margin-right:0}
.t-unit-detail.enemy .t-portrait{image-rendering:auto;opacity:1}
.t-detail-sigil{display:block;position:absolute;left:auto;right:5px;bottom:175px;font-size:50px;color:color-mix(in srgb, var(--gold), white 15%);filter:drop-shadow(0 0 12px color-mix(in srgb, color-mix(in srgb, var(--gold), black 15%) 33%, transparent))}
.t-detail-copy{padding:18px 15px 15px 10px;flex:1;min-width:0;height:260px;animation:detail-slide .48s .08s cubic-bezier(.16,1,.3,1) both}
.t-detail-copy .t-eyebrow{display:block;font-size:8px;letter-spacing:2px;color:color-mix(in srgb, var(--gold), black 10%)}
.t-detail-copy h3{font:30px var(--rpg-ui-font-display);margin:6px 0 3px;color:var(--cream)}
.t-detail-copy>small{font:15px var(--rpg-ui-font-display);color:color-mix(in srgb, var(--gold), white 20%)}
.t-detail-divider{height:1px;background:linear-gradient(90deg,color-mix(in srgb, color-mix(in srgb, var(--gold), black 20%) 67%, transparent),color-mix(in srgb, color-mix(in srgb, var(--gold), black 20%) 27%, transparent));margin:15px 0;position:relative}
.t-detail-divider span{position:absolute;right:0;top:-6px;font-size:9px;color:color-mix(in srgb, var(--gold), black 10%)}
.t-detail-stat{font-size:10px;letter-spacing:2px;margin:10px 0 6px;justify-content:flex-start;gap:14px}
.t-detail-stat strong{font-size:13px;color:color-mix(in srgb, var(--cream), white 40%);letter-spacing:1px}
.t-detail-track{position:relative;height:5px;border-radius:3px;background:color-mix(in srgb, color-mix(in srgb, var(--muted), black 15%) 20%, transparent);overflow:hidden;box-shadow:0 0 9px color-mix(in srgb, color-mix(in srgb, var(--t-success), white 20%) 13%, transparent)}
.t-detail-track>span{background:linear-gradient(90deg,var(--t-success),color-mix(in srgb, var(--t-success), white 55%));border-radius:3px}
.t-detail-track.mana>span{background:linear-gradient(90deg,color-mix(in srgb, var(--t-accent), black 15%),color-mix(in srgb, var(--t-accent), white 45%))}
.t-detail-copy p.t-detail-bio{display:block;font:italic 13px/1.6 var(--rpg-ui-font-display);color:var(--gold);margin:15px 0 7px;max-width:235px}
.t-detail-copy .t-detail-note{display:block;font-size:9px;letter-spacing:1px;margin-top:8px;color:color-mix(in srgb, var(--muted), black 10%)}
.t-hp-loss{position:absolute;top:0;height:100%;background:repeating-linear-gradient(115deg,color-mix(in srgb, var(--gold), white 15%) 0 4px,color-mix(in srgb, var(--t-danger), black 15%) 4px 8px);animation:loss-pulse 1s ease-in-out infinite}
.t-integrated-forecast{margin-top:11px;border-left:1px solid color-mix(in srgb, var(--gold), black 5%);padding-left:10px}
.t-integrated-forecast>div{display:flex;justify-content:space-between;align-items:center;gap:8px;color:var(--gold);font-size:11px}
.t-integrated-forecast strong{font:24px var(--rpg-ui-font-display);color:color-mix(in srgb, var(--gold), white 55%)}.t-integrated-forecast strong small{font-size:10px}
.t-detail-copy .t-integrated-forecast p{display:block;font-size:11px;margin:6px 0;color:color-mix(in srgb, var(--gold), white 35%);line-height:1.4}.t-integrated-forecast b{color:color-mix(in srgb, var(--t-danger), white 20%);font-size:16px}.t-integrated-forecast p span{padding:0 5px}
.t-integrated-forecast>small{display:block;font-size:10px;color:color-mix(in srgb, var(--muted), white 25%)}.t-integrated-forecast em{display:block;font-size:9px;font-style:normal;margin-top:7px;color:var(--gold)}
.t-skill-menu{right:240px;bottom:325px;width:420px;background:linear-gradient(135deg,color-mix(in srgb, color-mix(in srgb, var(--ink), white 5%) 97%, transparent),color-mix(in srgb, var(--ink) 97%, transparent));border-color:color-mix(in srgb, color-mix(in srgb, var(--gold), black 10%) 53%, transparent);border-radius:3px 18px 3px 3px}
@keyframes portrait-slide{from{opacity:0;transform:translate(-65px,30px)}to{opacity:1;transform:translate(0,0)}}
@keyframes detail-slide{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:translateX(0)}}
@keyframes command-rise{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes loss-pulse{50%{opacity:.45}}
.t-reduced .t-detail-art,.t-reduced .t-detail-copy,.t-reduced .t-actions,.t-reduced .t-hp-loss{animation:none}.t-reduced .t-action-buttons button,.t-reduced .t-detail-track>span{transition:none}
@media(min-width:1500px){.t-unit-detail{height:280px}.t-detail-art{height:410px}.t-detail-copy{height:280px}.t-actions{width:360px}.t-command-deck{gap:55px}.t-order{width:230px}.t-action-buttons button{min-height:58px}}
@media(max-width:1050px){.t-bottom{padding-inline:16px}.t-command-deck,.t-command-deck.is-idle{gap:16px}.t-actions{width:29vw}.t-order{width:140px}.t-action-buttons button{gap:8px;padding-left:10px}.t-action-buttons button strong{font-size:16px}.t-action-buttons button small{font-size:9px}.t-detail-copy h3{font-size:25px}.t-detail-art{height:320px}.t-detail-copy{padding-right:10px}.t-detail-sigil{font-size:35px}.t-skill-menu{right:170px}}
@media(max-width:700px){
 .t-bottom.has-character .t-command-deck{min-height:184px}
 .t-bottom{padding:0 12px 10px}.t-bottom.has-character:before{inset:-120px 0 0;clip-path:polygon(0 0,65% 0,78% 8%,100% 8%,100% 100%,0 100%)}
 .t-command-deck,.t-command-deck.is-idle{gap:14px;min-height:60px;align-items:flex-end}.t-actions{width:calc(100% - 110px);padding:0}.t-actions .t-section-title{display:none}.t-action-buttons{gap:5px}.t-action-buttons button{min-height:42px;padding:6px 22px 6px 10px;gap:8px}.t-action-buttons button>span{font-size:22px;width:25px}.t-action-buttons button strong{font-size:14px}.t-action-buttons button small{font-size:8px;display:block}.t-order{width:96px;padding-bottom:7px;min-height:0}.t-phase-button,.t-order .t-gold-button{min-height:44px;font-size:13px;padding:6px}.t-order>small{font-size:6px;letter-spacing:1px;margin-top:14px}.t-hint{font-size:8px;padding:6px 10px;margin-bottom:7px}.t-bottom.has-character .t-hint{max-width:100%;margin-right:auto}
 .t-unit-detail,.t-unit-detail.enemy{bottom:220px;left:0;top:auto;width:100%;height:125px}.t-detail-art{width:34%;height:175px}.t-detail-copy{height:125px;padding:5px 20px 0 6px}.t-detail-copy h3{font-size:22px;margin:2px 0}.t-detail-copy .t-eyebrow{font-size:6px;letter-spacing:1px}.t-detail-copy>small{font-size:11px}.t-detail-divider{margin:8px 0}.t-detail-stat{font-size:8px;margin:6px 0 4px}.t-detail-stat strong{font-size:10px}.t-detail-copy p.t-detail-bio,.t-detail-copy .t-detail-note{display:none}.t-detail-sigil{display:none}.t-unit-detail.enemy .t-detail-art{height:140px;width:30%;margin-right:4%}.t-integrated-forecast{margin-top:5px;padding-left:7px}.t-integrated-forecast>div{font-size:9px}.t-integrated-forecast strong{font-size:18px}.t-detail-copy .t-integrated-forecast p{font-size:9px;margin:3px 0}.t-integrated-forecast>small,.t-integrated-forecast em{font-size:8px;margin-top:3px}.t-unit-detail.predicting{height:165px}.t-unit-detail.predicting .t-detail-copy{height:165px}
 .t-skill-menu{left:12px;right:12px;bottom:215px;width:auto;max-height:calc(100dvh - 290px);overflow-y:auto;z-index:35}.t-footnote{display:none}
}
@media(max-height:600px) and (min-width:701px){.t-detail-art{height:235px}.t-unit-detail,.t-detail-copy{height:210px}.t-detail-copy p.t-detail-bio,.t-detail-note{display:none}.t-action-buttons button{min-height:36px;padding-block:5px}.t-action-buttons button small{display:none}.t-actions{padding:0}.t-skill-menu{bottom:230px;max-height:calc(100dvh - 250px);overflow:auto}}
`;
