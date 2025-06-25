const appDiv = document.getElementById('app');

function renderLogin() {
  appDiv.innerHTML = `
    <h2>Login with Google</h2>
    <button id="google-login">Login</button>
    <div id="login-status"></div>
  `;
  document.getElementById('google-login').onclick = async () => {
    document.getElementById('login-status').innerText = "Opening browser for Google login...";
    await window.electronAPI.googleOAuthLogin();
    // Wait for oauth code via local server callback
  };
}

// Listen for OAuth code and codeVerifier from main process
window.electronAPI.onOAuthCode(async ({ code, codeVerifier }) => {
  document.getElementById('login-status').innerText = "Exchanging code for token...";
  try {
    const res = await fetch('http://localhost:5000/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, codeVerifier }), // codeVerifier needed for PKCE
    });

    if (!res.ok) {
      let errorMsg = `HTTP error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    if (data.jwt) {
      window.localStorage.setItem('jwt', data.jwt);
      window.localStorage.setItem('email', data.email);
      renderDashboard();
    } else {
      document.getElementById('login-status').innerText = "Login failed: " + (data.error || "Unknown error");
    }
  } catch (error) {
    document.getElementById('login-status').innerText = "Login failed: " + error.message;
    console.error('Fetch error:', error);
  }
});

function renderDashboard() {
  appDiv.innerHTML = `
    <h2>Dashboard</h2>
    <form id="create-meeting-form">
      <input id="meeting-title" placeholder="Meeting title" required />
      <input id="start-time" type="datetime-local" required />
      <input id="end-time" type="datetime-local" required />
      <button type="submit">Create Meeting</button>
    </form>
    <div id="join-code-result"></div>
    <input id="join-code" placeholder="Enter join code" />
    <button id="join-meeting">Join Meeting</button>
  `;

  document.getElementById('create-meeting-form').onsubmit = async (e) => {
    e.preventDefault();
    const summary = document.getElementById('meeting-title').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const token = window.localStorage.getItem('jwt');

    try {
      const res = await fetch('http://localhost:5000/api/create-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify({ summary, startTime, endTime }),
      });

      if (!res.ok) {
        let errorMsg = `HTTP error ${res.status}`;
        try {
          const errJson = await res.json();
          errorMsg = errJson.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data.joinCode) {
        document.getElementById('join-code-result').innerHTML = `<strong>Share this join code with attendees:</strong> <code>${data.joinCode}</code>`;
      } else {
        document.getElementById('join-code-result').innerText = 'Error: ' + (data.error || 'Unknown error');
      }
    } catch (error) {
      document.getElementById('join-code-result').innerText = 'Error: ' + error.message;
      console.error('Fetch error:', error);
    }
  };

  document.getElementById('join-meeting').onclick = () => {
    const code = document.getElementById('join-code').value;
    window.electronAPI.openMeetingWindow(code);
  };
}

renderLogin();
