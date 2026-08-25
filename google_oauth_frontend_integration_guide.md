# Google OAuth - Frontend Integration Guide

## Backend Handles Everything - Zero Extra Dependencies!

Your backend now has a complete Google OAuth flow. Frontend just needs a simple button.

---

# Frontend Implementation

## Option 1: Simple Link (Easiest)

```jsx
<a
  href="https://trumarkz-api-54038467488.asia-south1.run.app/auth/google/url"
  onClick={handleGoogleLogin}
  className="google-signin-button"
>
  <img src="/google-icon.svg" alt="Google" />
  Sign in with Google
</a>

<script>
const handleGoogleLogin = async (e) => {
  e.preventDefault();

  // Get Google auth URL from backend
  const response = await fetch(
    'https://trumarkz-api-54038467488.asia-south1.run.app/auth/google/url'
  );

  const data = await response.json();

  // Redirect user to Google
  window.location.href = data.auth_url;
}
</script>
```

---

## Option 2: Direct Redirect

```jsx
<button onClick={() => {
  window.location.href =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    'client_id=54038467488-qv20pmm5bigpiiepsp7btsh6hdd5r6n9.apps.googleusercontent.com&' +
    'redirect_uri=https://trumarkz-api-54038467488.asia-south1.run.app/auth/google/callback&' +
    'response_type=code&' +
    'scope=openid email profile&' +
    'access_type=offline&' +
    'prompt=consent';
}}>
  Sign in with Google
</button>
```

---

# Complete Flow

## 1. User Clicks "Sign in with Google"

```txt
Frontend → Redirects to Google login
```

## 2. User Logs into Google

```txt
Google authenticates user
```

## 3. Google Redirects to Backend

```txt
Google → https://trumarkz-api-54038467488.asia-south1.run.app/auth/google/callback?code=...
```

## 4. Backend Processes & Redirects to Frontend

```txt
Backend → https://trumarkz.asynk.in/auth/callback?token=JWT_TOKEN&requires_onboarding=true/false
```

## 5. Frontend Receives Token

Create a callback page at `/auth/callback`

```jsx
// pages/auth/callback.jsx or AuthCallback.jsx

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const requiresOnboarding = searchParams.get('requires_onboarding') === 'true';

    if (token) {
      // Store JWT token
      localStorage.setItem('access_token', token);

      // Redirect based on onboarding status
      if (requiresOnboarding) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Handle error
      navigate('/login?error=auth_failed');
    }
  }, [searchParams, navigate]);

  return (
    <div className="loading">
      <p>Completing sign in...</p>
    </div>
  );
}

export default AuthCallback;
```

---

# Error Handling

Create error page at `/auth/error`

```jsx
// pages/auth/error.jsx

import { useSearchParams } from 'react-router-dom';

function AuthError() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="error-page">
      <h2>Authentication Error</h2>
      <p>{message || 'Something went wrong'}</p>
      <a href="/login">Back to Login</a>
    </div>
  );
}

export default AuthError;
```

---

# Complete Login Page Example

```jsx
import { useState } from 'react';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    const response = await fetch(
      'https://trumarkz-api-54038467488.asia-south1.run.app/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }
    );

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('access_token', data.access_token);

      if (data.requires_onboarding) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const handleGoogleLogin = async () => {
    // Get auth URL from backend
    const response = await fetch(
      'https://trumarkz-api-54038467488.asia-south1.run.app/auth/google/url'
    );

    const data = await response.json();

    // Redirect to Google
    window.location.href = data.auth_url;
  };

  return (
    <div className="login-page">
      <h1>Login to TruMarkZ</h1>

      {/* Email/Password Form */}
      <form onSubmit={handleEmailLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login with Email</button>
      </form>

      <div className="divider">OR</div>

      {/* Google Sign-In Button */}
      <button
        onClick={handleGoogleLogin}
        className="google-button"
      >
        <img src="/google-icon.svg" alt="Google" width="20" />
        Sign in with Google
      </button>

      <p>
        Don't have an account? <a href="/signup">Sign up</a>
      </p>
    </div>
  );
}

export default LoginPage;
```

---

# No npm packages needed! No Google SDK! Backend handles everything!

Just:

1. Add "Sign in with Google" button
2. Create `/auth/callback` page to receive token
3. Create `/auth/error` page for errors
4. Done!

---

# Security Notes

- JWT tokens are returned in URL (callback)
- Frontend should immediately store in localStorage and clear URL
- Use HTTPS in production
- Token expires after 1 hour (`JWT_EXPIRE_MINUTES`)

---

# Testing

1. Deploy backend with new changes
2. Add callback routes in frontend
3. Click "Sign in with Google"
4. Should redirect through Google and back with token
