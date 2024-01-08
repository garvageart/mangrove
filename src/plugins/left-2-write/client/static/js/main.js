if (location.hostname !== ("127.0.0.1" || "localhost") && !location.port) {
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', 'upgrade-insecure-requests');

    document.head.appendChild(meta);
}

console.log(`


%cHey! 🫵 I see you in here. What are you trying to look at, hmm? 👀
If you're trying see my impecable genius, shoot me an email and let's chat and you can learn more
%c📩 hello@lesis.online


`, "font-size:18px; font-weight:bold;", "color: #F8F8F8; background-color: #111111;font-size: 20px");