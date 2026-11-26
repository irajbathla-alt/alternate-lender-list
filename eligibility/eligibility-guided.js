/* Vancouver Finance Company — guided visual layer only. Eligibility assessment and form submission remain in index.html. */
(() => {
  const boot = () => {
    const sourceForm = document.getElementById('eligibilityForm');
    const page = document.getElementById('page1');
    const result = document.getElementById('result');
    if (!sourceForm || !page || !result || document.getElementById('guidedFlow')) return;

    sourceForm.classList.add('guided-source-form');
    page.classList.add('guided-page');
    const title = page.querySelector('h2');
    const flow = document.createElement('div');
    flow.id = 'guidedFlow';
    flow.className = 'guided-flow';
    sourceForm.parentNode.insertBefore(flow, sourceForm);

    // Preserve the original Vancouver Finance Company four-field eligibility form.
    const questions = [
      { id:'industry', kicker:'About your business', title:'What industry is your business in?', type:'industryDeck' },
      { id:'time', kicker:'Business history', title:'How long have you been in business?', type:'selectAsChoices' },
      { id:'revenue', kicker:'Business revenue', title:'What is your monthly business revenue?', type:'selectAsChoices' },
      { id:'credit', kicker:'Credit profile', title:'What is your estimated credit score?', type:'selectAsChoices' }
    ];

    let index = 0;
    let moving = false;
    const exactMode = {};
    let industryDeckIndex = 0;
    const source = id => document.getElementById(id);
    const moneyNumber = value => Number(String(value || '').replace(/[^0-9.]/g,'')) || 0;
    const moneyDisplay = value => {
      const n = moneyNumber(value);
      return n ? new Intl.NumberFormat('en-CA').format(n) : '';
    };
    const visible = () => questions.filter(q => !(q.skip && q.skip()));
    const actualPosition = q => visible().findIndex(x => x === q);
    const nextIndex = (from, direction) => {
      let i = from + direction;
      while (i >= 0 && i < questions.length && questions[i].skip && questions[i].skip()) i += direction;
      return i;
    };
    const valid = q => {
      const el = source(q.id);
      if (!el) return false;
      if (q.type === 'amountChoice') {
        const n = moneyNumber(el.value);
        return q.id === 'requestedAmount' ? n >= 1000 : n >= 0 && String(el.value) !== '';
      }
      return String(el.value || '').trim() !== '';
    };
    const optionPairs = q => {
      if (q.options) return q.options;
      const el = source(q.id);
      return Array.from(el.options).filter(o => o.value !== '').map(o => [o.value, o.textContent]);
    };
    const clearMotion = () => flow.classList.remove('enter-forward','enter-back','leave-forward','leave-back');
    const animateIn = direction => {
      clearMotion();
      flow.classList.add(direction < 0 ? 'enter-back' : 'enter-forward');
      setTimeout(() => flow.classList.remove('enter-forward','enter-back'), 310);
    };
    const transitionTo = (target, direction) => {
      if (moving) return;
      moving = true;
      clearMotion();
      flow.classList.add(direction < 0 ? 'leave-back' : 'leave-forward');
      setTimeout(() => {
        index = target;
        render(direction);
        moving = false;
      }, 170);
    };
    const finish = () => {
      if (moving) return;
      moving = true;
      flow.classList.add('leave-forward');
      setTimeout(() => {
        flow.classList.add('guided-complete');
        if (title) title.textContent = 'Your Options';
        sourceForm.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
        result.classList.add('guided-result-enter');
        setTimeout(() => result.classList.remove('guided-result-enter'), 450);
        moving = false;
      }, 170);
    };
    const advance = () => {
      const q = questions[index];
      if (!valid(q) || moving) return;
      if (q.id === 'activeFinancing' && source(q.id).value === '0') source('monthlyDebt').value = '0';
      const next = nextIndex(index, 1);
      if (next >= questions.length) return finish();
      transitionTo(next, 1);
    };
    const back = () => {
      if (moving) return;
      const prev = nextIndex(index, -1);
      if (prev < 0) {
        const backToIntro = document.getElementById('backToIntro');
        if (backToIntro) backToIntro.click();
        return;
      }
      transitionTo(prev, -1);
    };
    const chooseAndAdvance = (q, btn) => {
      if (moving) return;
      source(q.id).value = btn.dataset.value;
      flow.querySelectorAll('.guided-choice').forEach(x => {
        x.classList.toggle('selected', x === btn);
        x.disabled = true;
      });
      setTimeout(advance, 190);
    };

    const render = direction => {
      clearMotion();
      const q = questions[index];
      const list = visible();
      const pos = actualPosition(q);
      const total = list.length;
      const progress = Math.max(8, ((pos + 1) / total) * 100);
      let control = '';

      if (q.type === 'industryDeck') {
        const opts = optionPairs(q);
        const deckCards = [0,1,2,3].map(offset => {
          const pair = opts[(industryDeckIndex + offset) % opts.length];
          return '<button type="button" class="industry-deck-card deck-' + offset + '" data-value="' + String(pair[0]).replace(/"/g,'&quot;') + '" data-offset="' + offset + '"><span class="industry-card-label">Industry</span><strong>' + pair[1] + '</strong><span class="industry-card-action">' + (offset===0 ? 'Tap to choose' : '') + '</span></button>';
        }).reverse().join('');
        control = '<div class="industry-deck" id="industryDeck">' + deckCards + '</div><div class="industry-deck-nav"><button type="button" class="deck-arrow" data-dir="-1" aria-label="Previous industry">←</button><span>Swipe to browse</span><button type="button" class="deck-arrow" data-dir="1" aria-label="Next industry">→</button></div>';
      } else if (q.type === 'choice' || q.type === 'selectAsChoices') {
        control = '<div class="guided-choices' + (q.compact ? ' compact' : '') + '">' + optionPairs(q).map(pair => {
          const selected = String(source(q.id).value) === String(pair[0]);
          return '<button type="button" class="guided-choice' + (selected ? ' selected' : '') + '" data-value="' + String(pair[0]).replace(/"/g,'&quot;') + '">' + pair[1] + '</button>';
        }).join('') + '</div>';
      } else if (q.type === 'amountChoice') {
        const current = Number(source(q.id).value || 0);
        const isPreset = q.options.some(pair => Number(pair[0]) === current) && !exactMode[q.id];
        control = '<div class="guided-choices amount-options">' + q.options.map(pair => {
          const selected = isPreset && Number(pair[0]) === current;
          return '<button type="button" class="guided-choice' + (selected ? ' selected' : '') + '" data-value="' + pair[0] + '">' + pair[1] + '</button>';
        }).join('') +
        '<button type="button" class="guided-choice exact-choice' + (exactMode[q.id] ? ' selected' : '') + '" data-exact="1">Enter exact amount</button></div>' +
        (exactMode[q.id] ? '<div class="guided-exact-wrap"><div class="guided-money"><span>$</span><input id="guidedExact" inputmode="decimal" autocomplete="off" placeholder="Enter amount" value="' + moneyDisplay(source(q.id).value) + '"></div><button type="button" class="guided-exact-go" aria-label="Use exact amount">→</button></div>' : '');
      }

      flow.innerHTML =
        '<div class="guided-head"><button type="button" class="guided-back" aria-label="Go to previous question">← Back</button><span>' + (pos + 1) + ' / ' + total + '</span></div>' +
        '<div class="guided-progress"><i style="width:' + progress + '%"></i></div>' +
        '<div class="guided-question"><div class="guided-kicker">' + q.kicker + '</div><h3>' + q.title + '</h3>' +
        (q.help ? '<p>' + q.help + '</p>' : '') + control +
        ((q.type === 'choice' || q.type === 'selectAsChoices' || q.type === 'amountChoice') ? '<div class="guided-tap-hint">Tap an option to continue</div>' : '') +
        '<div class="guided-footnote">Preliminary assessment only. Final eligibility is subject to verification and lender underwriting.</div></div>';

      flow.querySelector('.guided-back').onclick = back;

      if (q.type === 'industryDeck') {
        const opts = optionPairs(q);
        const deck = flow.querySelector('#industryDeck');

        const setCardContent = (card, pair, offset) => {
          card.dataset.value = pair[0];
          card.dataset.offset = String(offset);
          const label = card.querySelector('strong');
          const action = card.querySelector('.industry-card-action');
          if (label) label.textContent = pair[1];
          if (action) action.textContent = offset === 0 ? 'Tap to choose' : '';
        };

        const normalizeDeck = () => {
          const cards = Array.from(deck.querySelectorAll('.industry-deck-card'));
          cards.forEach(card => {
            card.className = 'industry-deck-card';
            card.style.transform = '';
            card.style.opacity = '';
          });
          cards.forEach((card, offset) => {
            card.classList.add('deck-' + offset);
            const pair = opts[(industryDeckIndex + offset) % opts.length];
            setCardContent(card, pair, offset);
          });
          bindTopCard();
        };

        const rotateForward = () => {
          if (moving) return;
          moving = true;
          const cards = Array.from(deck.querySelectorAll('.industry-deck-card')).sort((a,b)=>Number(a.dataset.offset)-Number(b.dataset.offset));
          const top = cards[0], c1 = cards[1], c2 = cards[2], c3 = cards[3];

          top.classList.add('swipe-left');
          c1.classList.add('promote-1');
          c2.classList.add('promote-2');
          c3.classList.add('promote-3');

          setTimeout(() => {
            industryDeckIndex = (industryDeckIndex + 1) % opts.length;

            top.className = 'industry-deck-card deck-3';
            c1.className = 'industry-deck-card deck-0';
            c2.className = 'industry-deck-card deck-1';
            c3.className = 'industry-deck-card deck-2';

            [c1,c2,c3,top].forEach((card, offset) => {
              card.style.transform = '';
              card.style.opacity = '';
              const pair = opts[(industryDeckIndex + offset) % opts.length];
              setCardContent(card, pair, offset);
            });

            bindTopCard();
            moving = false;
          }, 270);
        };

        const rotateBackward = () => {
          if (moving) return;
          moving = true;
          const cards = Array.from(deck.querySelectorAll('.industry-deck-card')).sort((a,b)=>Number(a.dataset.offset)-Number(b.dataset.offset));
          const top = cards[0], c1 = cards[1], c2 = cards[2], c3 = cards[3];
          const prevIndex = (industryDeckIndex - 1 + opts.length) % opts.length;
          const prevPair = opts[prevIndex];

          c3.className = 'industry-deck-card entering-prev';
          setCardContent(c3, prevPair, 0);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            c3.classList.add('enter-prev-active');
            top.classList.add('shift-back-0');
            c1.classList.add('shift-back-1');
            c2.classList.add('shift-back-2');
          }));

          setTimeout(() => {
            industryDeckIndex = prevIndex;

            c3.className = 'industry-deck-card deck-0';
            top.className = 'industry-deck-card deck-1';
            c1.className = 'industry-deck-card deck-2';
            c2.className = 'industry-deck-card deck-3';

            [c3,top,c1,c2].forEach((card, offset) => {
              card.style.transform = '';
              card.style.opacity = '';
              const pair = opts[(industryDeckIndex + offset) % opts.length];
              setCardContent(card, pair, offset);
            });

            bindTopCard();
            moving = false;
          }, 270);
        };

        function bindTopCard() {
          const topCard = deck.querySelector('.industry-deck-card.deck-0');
          if (!topCard || topCard.dataset.bound === '1') return;
          topCard.dataset.bound = '1';

          let startX = 0;
          let currentX = 0;
          let hasDragged = false;
          let pointerId = null;

          topCard.addEventListener('click', () => {
            if (hasDragged || moving) return;
            source(q.id).value = topCard.dataset.value;
            topCard.classList.add('chosen');
            setTimeout(advance, 180);
          });

          topCard.addEventListener('pointerdown', e => {
            if (moving) return;
            pointerId = e.pointerId;
            startX = e.clientX;
            currentX = 0;
            hasDragged = false;
            topCard.setPointerCapture(pointerId);
            topCard.classList.add('dragging');
          });

          topCard.addEventListener('pointermove', e => {
            if (pointerId !== e.pointerId) return;
            currentX = e.clientX - startX;
            if (Math.abs(currentX) > 6) hasDragged = true;
            const rotate = currentX / 24;
            topCard.style.transform = 'translate3d(' + currentX + 'px,0,0) rotate(' + rotate + 'deg)';
            topCard.style.opacity = String(Math.max(.78,1-Math.abs(currentX)/500));
          });

          const finishDrag = e => {
            if (pointerId !== e.pointerId) return;
            try { topCard.releasePointerCapture(pointerId); } catch(err) {}
            topCard.classList.remove('dragging');

            const distance = currentX;
            pointerId = null;

            if (Math.abs(distance) > 70) {
              topCard.style.transform = '';
              topCard.style.opacity = '';
              if (distance < 0) rotateForward();
              else rotateBackward();
            } else {
              topCard.style.transform = '';
              topCard.style.opacity = '';
              setTimeout(() => { hasDragged = false; }, 60);
            }
          };

          topCard.addEventListener('pointerup', finishDrag);
          topCard.addEventListener('pointercancel', finishDrag);
        }

        flow.querySelectorAll('.deck-arrow').forEach(btn => {
          btn.onclick = () => Number(btn.dataset.dir) > 0 ? rotateForward() : rotateBackward();
        });

        bindTopCard();
      } else if (q.type === 'choice' || q.type === 'selectAsChoices') {
        flow.querySelectorAll('.guided-choice').forEach(btn => btn.onclick = () => chooseAndAdvance(q, btn));
      } else if (q.type === 'amountChoice') {
        flow.querySelectorAll('.guided-choice[data-value]').forEach(btn => btn.onclick = () => {
          exactMode[q.id] = false;
          chooseAndAdvance(q, btn);
        });
        const exactBtn = flow.querySelector('.exact-choice');
        if (exactBtn) exactBtn.onclick = () => {
          if (moving) return;
          exactMode[q.id] = true;
          render(direction || 1);
          setTimeout(() => {
            const input = flow.querySelector('#guidedExact');
            if (input) input.focus();
          }, 40);
        };
        const exactInput = flow.querySelector('#guidedExact');
        const exactGo = flow.querySelector('.guided-exact-go');
        if (exactInput) {
          exactInput.oninput = () => {
            source(q.id).value = String(moneyNumber(exactInput.value));
            exactInput.value = moneyDisplay(exactInput.value);
            if (exactGo) exactGo.disabled = !valid(q);
            try { exactInput.setSelectionRange(exactInput.value.length, exactInput.value.length); } catch(e) {}
          };
          exactInput.onkeydown = e => {
            if (e.key === 'Enter' && valid(q)) {
              e.preventDefault();
              exactInput.blur();
              advance();
            }
          };
          setTimeout(() => {
            try { exactInput.scrollIntoView({behavior:'smooth',block:'center'}); } catch(e) {}
          }, 220);
        }
        if (exactGo) {
          exactGo.disabled = !valid(q);
          exactGo.onclick = () => {
            if (!valid(q)) return;
            if (exactInput) exactInput.blur();
            advance();
          };
        }
      }

      requestAnimationFrame(() => animateIn(direction || 1));
    };

    render(1);

    const observer = new MutationObserver(() => {
      if (!result.classList.contains('hidden') && flow.classList.contains('guided-complete')) {
        flow.style.display = 'none';
      }
    });
    observer.observe(result, { attributes:true, attributeFilter:['class'] });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();