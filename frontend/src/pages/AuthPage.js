import React, { useState } from 'react';
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth';

const AuthPage = ({ onAuthSuccess }) => {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'verify'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Enforce business rule: only specific domains
    const validateEmail = (emailAddress) => {
        return emailAddress.endsWith('@amalitech.com') || emailAddress.endsWith('@amalitechtraining.org');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { isSignedIn } = await signIn({ username: email, password });
            if (isSignedIn) {
                onAuthSuccess(); // Refresh AuthContext session
            }
        } catch (err) {
            setError(err.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!validateEmail(email)) {
            setError('Signup failed: Only @amalitech.com or @amalitechtraining.org emails are allowed.');
            return;
        }

        setLoading(true);
        try {
            await signUp({
                username: email,
                password,
                options: {
                    userAttributes: { email }
                }
            });
            // Proceed to verification step
            setMode('verify');
            setError('Verification code sent to your email!');
        } catch (err) {
            setError(err.message || 'Sign up failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { isSignUpComplete } = await confirmSignUp({
                username: email,
                confirmationCode: verificationCode
            });
            if (isSignUpComplete) {
                setMode('login');
                setError('Verification successful! You can now log in.');
                setVerificationCode('');
            }
        } catch (err) {
            setError(err.message || 'Verification failed. Invalid code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>
                    {mode === 'login' && 'Sign In to Task Manager'}
                    {mode === 'signup' && 'Create your Account'}
                    {mode === 'verify' && 'Verify your Email'}
                </h2>
                
                {error && <div style={styles.errorBox}>{error}</div>}

                {mode === 'login' && (
                    <form onSubmit={handleLogin} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label>Email</label>
                            <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                style={styles.input} 
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>Password</label>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                style={styles.input} 
                            />
                        </div>
                        <button type="submit" disabled={loading} style={styles.button}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                        <div style={styles.footerLink}>
                            Don't have an account?{' '}
                            <button type="button" onClick={() => { setMode('signup'); setError(''); }} style={styles.linkButton}>
                                Sign up
                            </button>
                        </div>
                    </form>
                )}

                {mode === 'signup' && (
                    <form onSubmit={handleSignUp} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label>Organization Email</label>
                            <input 
                                type="email" 
                                placeholder="@amalitech.com or @amalitechtraining.org"
                                required 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                style={styles.input} 
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>Choose a Password</label>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                style={styles.input} 
                            />
                        </div>
                        <button type="submit" disabled={loading} style={styles.button}>
                            {loading ? 'Creating...' : 'Create Account'}
                        </button>
                        <div style={styles.footerLink}>
                            <button type="button" onClick={() => { setMode('verify'); setError(''); }} style={{ ...styles.linkButton, marginRight: '15px' }}>
                                Have a verification code?
                            </button>
                            <button type="button" onClick={() => { setMode('login'); setError(''); }} style={styles.linkButton}>
                                Back to Sign In
                            </button>
                        </div>
                    </form>
                )}

                {mode === 'verify' && (
                    <form onSubmit={handleVerify} style={styles.form}>
                        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginBottom: '1rem', color: '#555' }}>
                            We sent a verification code to <strong>{email || 'your email'}</strong>
                        </p>
                        <div style={styles.inputGroup}>
                            <label>Confirm Email</label>
                            <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                style={styles.input} 
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label>Verification Code</label>
                            <input 
                                type="text" 
                                required 
                                value={verificationCode} 
                                onChange={e => setVerificationCode(e.target.value)} 
                                style={styles.input} 
                            />
                        </div>
                        <button type="submit" disabled={loading} style={styles.button}>
                            {loading ? 'Verifying...' : 'Submit Verification'}
                        </button>
                        <div style={styles.footerLink}>
                            <button type="button" onClick={() => { setMode('login'); setError(''); }} style={styles.linkButton}>
                                Back to Sign In
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// Extremely basic inline styling to keep the example clean and independent
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fa',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    card: {
        backgroundColor: '#fff',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
    },
    title: {
        marginTop: 0,
        marginBottom: '1.5rem',
        textAlign: 'center',
        color: '#333'
    },
    errorBox: {
        backgroundColor: '#fee2e2',
        color: '#b91c1c',
        padding: '0.75rem',
        borderRadius: '4px',
        marginBottom: '1rem',
        fontSize: '0.9rem',
        border: '1px solid #fca5a5'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem'
    },
    input: {
        padding: '0.75rem',
        border: '1px solid #cbd5e1',
        borderRadius: '4px',
        fontSize: '1rem'
    },
    button: {
        padding: '0.75rem',
        backgroundColor: '#0284c7',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '0.5rem'
    },
    footerLink: {
        textAlign: 'center',
        marginTop: '1rem',
        fontSize: '0.9rem',
        color: '#64748b'
    },
    linkButton: {
        background: 'none',
        border: 'none',
        color: '#0284c7',
        cursor: 'pointer',
        textDecoration: 'underline',
        padding: 0,
        fontSize: '0.9rem'
    }
};

export default AuthPage;
