import React, { useState } from 'react';
import { signIn, signUp, confirmSignUp, confirmSignIn } from 'aws-amplify/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './AuthPage.module.css';

const AuthPage = ({ onAuthSuccess }) => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const validateEmail = (emailAddress) => {
        return emailAddress.endsWith('@amalitech.com') || emailAddress.endsWith('@amalitechtraining.org') || emailAddress.endsWith('@gmail.com');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { isSignedIn, nextStep } = await signIn({ username: email, password });

            if (nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
                setMode('newPassword');
                toast.info('You must change your temporary password.');
            } else if (isSignedIn) {
                toast.success('Welcome back!');
                onAuthSuccess();
            }
        } catch (err) {
            toast.error(err.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleNewPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { isSignedIn } = await confirmSignIn({ challengeResponse: newPassword });
            if (isSignedIn) {
                toast.success('Password updated successfully!');
                onAuthSuccess();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };


    const handleSignUp = async (e) => {
        e.preventDefault();

        if (!validateEmail(email)) {
            toast.warning('Only corporate emails (@amalitech.com) are allowed.');
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
            setMode('verify');
            toast.success('Verification code sent to your email!');
        } catch (err) {
            toast.error(err.message || 'Sign up failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { isSignUpComplete } = await confirmSignUp({
                username: email,
                confirmationCode: verificationCode
            });
            if (isSignUpComplete) {
                setMode('login');
                toast.success('Account verified! You can now log in.');
                setVerificationCode('');
            }
        } catch (err) {
            toast.error('Verification failed. Invalid code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.authWrapper}>
                <div className={styles.branding}>
                    <div className={styles.logo}>Z</div>
                    <h1>Zenith-Task</h1>
                    <p>Enterprise Task Management</p>
                </div>

                <div className={styles.card}>
                    <h2 className={styles.title}>
                        {mode === 'login' && 'Sign In'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'verify' && 'Verify Email'}
                        {mode === 'newPassword' && 'Reset Password'}
                    </h2>

                    {mode === 'newPassword' && (
                        <form onSubmit={handleNewPassword} className={styles.form}>
                            <div className={styles.field}>
                                <label>New Password</label>
                                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                            </div>
                            <button type="submit" disabled={loading} className={styles.submitBtn}>
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    )}

                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className={styles.form}>
                            <div className={styles.field}>
                                <label>Email Address</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
                            </div>
                            <div className={styles.field}>
                                <label>Password</label>
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                            </div>
                            <button type="submit" disabled={loading} className={styles.submitBtn}>
                                {loading ? 'Signing in...' : 'Continue'}
                            </button>
                            <p className={styles.switchMode}>
                                New here? <button type="button" onClick={() => setMode('signup')}>Create an account</button>
                            </p>
                        </form>
                    )}

                    {mode === 'signup' && (
                        <form onSubmit={handleSignUp} className={styles.form}>
                            <div className={styles.field}>
                                <label>Work Email</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@amalitech.com" />
                            </div>
                            <div className={styles.field}>
                                <label>Choose Password</label>
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 12 characters" />
                            </div>
                            <button type="submit" disabled={loading} className={styles.submitBtn}>
                                {loading ? 'Creating...' : 'Create Account'}
                            </button>
                            <div className={styles.footerLinks}>
                                <button type="button" onClick={() => setMode('verify')}>I have a code</button>
                                <span>•</span>
                                <button type="button" onClick={() => setMode('login')}>Back to login</button>
                            </div>
                        </form>
                    )}

                    {mode === 'verify' && (
                        <form onSubmit={handleVerify} className={styles.form}>
                            <p className={styles.helpText}>Enter the code sent to {email}</p>
                            <div className={styles.field}>
                                <label>Verification Code</label>
                                <input type="text" required value={verificationCode} onChange={e => setVerificationCode(e.target.value)} placeholder="123456" />
                            </div>
                            <button type="submit" disabled={loading} className={styles.submitBtn}>
                                {loading ? 'Verifying...' : 'Verify Email'}
                            </button>
                            <button type="button" className={styles.backBtn} onClick={() => setMode('login')}>Cancel</button>
                        </form>
                    )}
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="colored" />
        </div>
    );
};

export default AuthPage;
