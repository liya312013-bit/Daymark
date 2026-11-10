    const menuToggle = document.querySelector(".topbar__toggle");
    const menu = document.querySelector(".menu");
    const quote = document.querySelector(".quote");
    const form = quote.querySelector("form");
    const quoteTitle = quote.querySelector("#quote-title");
    const quoteIntro = quote.querySelector("#quote-intro");
    const quoteSubmitLabel = quote.querySelector(".quote__submit-label");
    const quoteSubmit = form.querySelector('[type="submit"]');
    const quoteStatus = quote.querySelector("#quote-status");
    const thankYouMessage = document.querySelector("#thank-you-message");
    const demoThankYou = thankYouMessage.textContent;
    const demoIntro = quoteIntro.textContent;
    const quoteAction = form.getAttribute("action")?.trim();
    let pendingRequest;

    function getQuoteEndpoint() {
      if (!quoteAction) return null;
      try {
        const url = new URL(quoteAction, location.href);
        if (url.protocol === "https:" && !url.username && !url.password) return url;
      } catch {
        // An invalid address is handled by the form status message.
      }
      return null;
    }

    const quoteEndpoint = getQuoteEndpoint();
    const landing = document.querySelector("#landing");
    const footer = document.querySelector("#site-footer");
    const thankYou = document.querySelector("#thank-you");
    const thankYouTitle = document.querySelector("#thank-you-title");
    const homeTitle = document.title;
    let returnFocus;

    function renderPage() {
      const confirmation = history.state?.daymarkQuote;
      const showThankYou = location.hash === "#thank-you" && (confirmation === "demo" || confirmation === "sent");
      const wasOnThankYou = !thankYou.hidden;
      landing.hidden = showThankYou;
      footer.hidden = showThankYou;
      thankYou.hidden = !showThankYou;
      document.title = showThankYou ? "Thank you — Daymark" : homeTitle;
      if (showThankYou) {
        thankYouMessage.textContent = confirmation === "sent"
          ? "We received your Daymark request. We’ll follow up by email."
          : demoThankYou;
        if (quote.open) quote.close();
        window.scrollTo({ top: 0, behavior: "instant" });
        thankYouTitle.focus({ preventScroll: true });
      } else if (wasOnThankYou && location.hash === "#top") {
        window.scrollTo({ top: 0, behavior: "instant" });
        menuToggle.focus({ preventScroll: true });
      }
    }

    function setMenu(open) {
      menu.hidden = !open;
      menuToggle.setAttribute("aria-expanded", String(open));
    }

    menuToggle.addEventListener("click", () => setMenu(menu.hidden));
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        setMenu(false);
        menuToggle.focus();
      }
    });

    document.querySelectorAll("[data-open-quote]").forEach((button) => {
      button.addEventListener("click", () => {
        returnFocus = menu.contains(button) ? menuToggle : button;
        setMenu(false);
        const consultationSystem = button.dataset.consultationSystem;
        quoteTitle.textContent = consultationSystem ? "GET A CONSULTATION" : "GET A FREE QUOTE";
        quoteIntro.textContent = demoIntro;
        if (quoteAction) {
          quoteIntro.textContent = consultationSystem
            ? "Tell us which system you’re considering. We’ll follow up by email."
            : "Tell us about your home and we’ll email you an estimate.";
        }
        quoteStatus.hidden = true;
        quoteSubmitLabel.textContent = consultationSystem ? "REQUEST CONSULTATION" : "REQUEST MY QUOTE";
        if (consultationSystem) form.elements.system.value = consultationSystem;
        quote.showModal();
      });
    });

    quote.querySelector(".quote__close").addEventListener("click", () => quote.close());
    quote.addEventListener("close", () => {
      if (!landing.hidden) returnFocus?.focus();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (quoteSubmit.disabled || !form.reportValidity()) return;
      quoteStatus.hidden = true;

      if (quoteAction && !quoteEndpoint) {
        quoteStatus.hidden = false;
        quoteStatus.textContent = "The request form is temporarily unavailable.";
        return;
      }
      if (quoteEndpoint) {
        const values = Object.fromEntries(new FormData(form));
        const fingerprint = JSON.stringify(values);
        if (pendingRequest?.fingerprint !== fingerprint) {
          pendingRequest = { fingerprint, id: crypto.randomUUID() };
        }
        quoteSubmit.disabled = true;
        form.setAttribute("aria-busy", "true");
        try {
          const response = await fetch(quoteEndpoint, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: JSON.stringify({ ...values, requestId: pendingRequest.id }),
            credentials: "omit",
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok || (await response.json()).ok !== true) {
            throw new Error("Request was not confirmed");
          }
          pendingRequest = undefined;
        } catch {
          quoteStatus.hidden = false;
          quoteStatus.textContent = "We couldn’t confirm your request. Please try again.";
          return;
        } finally {
          quoteSubmit.disabled = false;
          form.removeAttribute("aria-busy");
        }
      }
      form.reset();
      history.pushState({ daymarkQuote: quoteEndpoint ? "sent" : "demo" }, "", "#thank-you");
      renderPage();
    });
    window.addEventListener("hashchange", renderPage);
    renderPage();

    const gallery = document.querySelector(".gallery");
    const galleryButtons = [...document.querySelectorAll(".examples__open")];
    const galleryFrame = gallery.querySelector(".gallery__photo");
    const galleryPhoto = galleryFrame.querySelector("img");
    const galleryLight = galleryFrame.querySelector(".project-light");
    const fullMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let galleryLightAnimation;

    function playGalleryLight() {
      galleryLightAnimation?.cancel();
      if (!fullMotion.matches || !gallery.open) return;
      const reflection = galleryFrame.dataset.lightKind === "reflection";
      const frames = reflection
        ? [
            { opacity: 0, backgroundPosition: "100% 50%" },
            { opacity: .72, backgroundPosition: "50% 50%" },
            { opacity: 0, backgroundPosition: "0% 50%" },
          ]
        : [
            { opacity: 0 },
            { opacity: .76, offset: .32 },
            { opacity: .76, offset: .72 },
            { opacity: 0 },
          ];
      galleryLightAnimation = galleryLight.animate(frames, {
        duration: reflection ? 1050 : 1650,
        easing: "ease-out",
      });
    }

    galleryPhoto.addEventListener("load", playGalleryLight);
    fullMotion.addEventListener("change", () => galleryLightAnimation?.cancel());
    const galleryCount = gallery.querySelector(".gallery__count");
    const mobileGallery = window.matchMedia("(max-width: 759px)");
    let galleryIndex = 0;
    let galleryOpener;

    function showProject(index) {
      galleryIndex = (index + galleryButtons.length) % galleryButtons.length;
      const card = galleryButtons[galleryIndex];
      const photo = card.querySelector("img");
      galleryLightAnimation?.cancel();
      galleryFrame.dataset.projectLight = card.dataset.projectLight;
      galleryFrame.dataset.lightKind = card.dataset.lightKind;
      const source = mobileGallery.matches ? card.querySelector("source") : photo;
      galleryPhoto.width = Number(source.getAttribute("width"));
      galleryPhoto.height = Number(source.getAttribute("height"));
      const url = new URL(source.getAttribute("srcset") || source.getAttribute("src"), document.baseURI).href;
      if (galleryPhoto.getAttribute("src") !== url) galleryPhoto.src = url;
      else playGalleryLight();
      galleryPhoto.alt = photo.alt;
      galleryCount.textContent = `${galleryIndex + 1} / ${galleryButtons.length}`;
    }

    galleryButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        galleryOpener = button;
        showProject(index);
        gallery.showModal();
        if (galleryPhoto.complete) playGalleryLight();
      });
    });
    gallery.querySelector(".gallery__close").addEventListener("click", () => gallery.close());
    gallery.querySelector(".gallery__prev").addEventListener("click", () => showProject(galleryIndex - 1));
    gallery.querySelector(".gallery__next").addEventListener("click", () => showProject(galleryIndex + 1));
    gallery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        showProject(galleryIndex + (event.key === "ArrowLeft" ? -1 : 1));
      }
    });
    gallery.addEventListener("close", () => {
      galleryLightAnimation?.cancel();
      galleryOpener?.focus();
    });
    mobileGallery.addEventListener("change", () => {
      if (gallery.open) showProject(galleryIndex);
    });

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      const hero = document.querySelector(".hero");
      const heroImage = hero.querySelector(".hero__photo img");
      const siteSun = document.querySelector(".site-sun");
      const sunParticles = [
        siteSun.querySelector(".site-sun__core"),
        ...siteSun.querySelectorAll(".site-sun__spark"),
      ];
      gsap.matchMedia().add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const particles = sunParticles.map((particle, index) => {
          const duration = [.12, .42, .29][index];
          return {
            x: gsap.quickTo(particle, "x", { duration, ease: "power2.out" }),
            y: gsap.quickTo(particle, "y", { duration, ease: "power2.out" }),
            fade: gsap.quickTo(particle, "opacity", { duration: .23, ease: "power2.out" }),
          };
        });
        gsap.set(sunParticles, { xPercent: -50, yPercent: -50 });
        let inside = false;
        let overPanelsBefore = false;
        let overControlBefore = false;
        let pulseTimer;

        function isOverPanels(event) {
          if (!hero.contains(event.target)) return false;
          const bounds = hero.getBoundingClientRect();
          const y = event.clientY - bounds.top;
          const portrait = mobileGallery.matches;
          const ratio = heroImage.naturalWidth / heroImage.naturalHeight || (portrait ? 941 / 1672 : 1672 / 941);
          const photoHeight = Math.max(bounds.height, bounds.width / ratio);
          const panelStart = bounds.height - photoHeight * (portrait ? .24 : .25);
          const panelEnd = bounds.height - photoHeight * (portrait ? .08 : .06);
          return y >= panelStart && y <= panelEnd;
        }

        function moveLight(event) {
          if (event.pointerType !== "mouse") return;
          const { clientX: x, clientY: y } = event;
          const layerHost = event.target.closest("dialog[open]") || document.body;
          if (siteSun.parentElement !== layerHost) layerHost.append(siteSun);
          const overPanels = isOverPanels(event);
          const overControl = Boolean(event.target.closest("button, a, input, select, textarea"));

          particles.forEach((particle, index) => {
            if (inside) {
              particle.x(x);
              particle.y(y);
            } else {
              particle.x(x, x);
              particle.y(y, y);
            }
            if (!inside || overPanels !== overPanelsBefore || overControl !== overControlBefore) {
              const glow = overPanels ? [1, .46, .67] : [.78, .31, .5];
              particle.fade(glow[index] * (overControl ? .58 : 1));
            }
          });
          if (overPanels && !overPanelsBefore && !hero.classList.contains("is-charging")) {
            hero.classList.add("is-charging");
            pulseTimer = window.setTimeout(() => hero.classList.remove("is-charging"), 1250);
          }
          overPanelsBefore = overPanels;
          overControlBefore = overControl;
          inside = true;
        }

        function hideLight() {
          inside = false;
          overPanelsBefore = false;
          particles.forEach(particle => particle.fade(0));
        }

        function releaseDialog() {
          document.body.append(siteSun);
          hideLight();
        }

        document.addEventListener("pointermove", moveLight, { passive: true });
        document.documentElement.addEventListener("pointerleave", hideLight);
        document.addEventListener("close", releaseDialog, true);
        window.addEventListener("blur", hideLight);
        return () => {
          document.removeEventListener("pointermove", moveLight);
          document.documentElement.removeEventListener("pointerleave", hideLight);
          document.removeEventListener("close", releaseDialog, true);
          window.removeEventListener("blur", hideLight);
          window.clearTimeout(pulseTimer);
          document.body.append(siteSun);
          hero.classList.remove("is-charging");
        };
      });
      const motion = gsap.matchMedia();
      motion.add({
        fullMotion: "(prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 759px)",
      }, ({ conditions }) => {
        if (!conditions.fullMotion || landing.hidden) return;
        const mobile = conditions.mobile;
        document.querySelectorAll(".backup__grid, .systems, .examples__grid, .cost, .plan").forEach((section) => {
          if (section.getBoundingClientRect().top < window.innerHeight) return;
          gsap.from(section.children, {
            y: mobile ? 18 : 30,
            opacity: 0,
            duration: mobile ? .42 : .6,
            stagger: .1,
            ease: "power2.out",
            clearProps: "opacity,transform",
            scrollTrigger: { trigger: section, start: "top 88%", once: true },
          });
        });
      });
      window.addEventListener("hashchange", () => {
        if (!landing.hidden) ScrollTrigger.refresh();
      });
    }
