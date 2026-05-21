import { getApp } from '@react-native-firebase/app';
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';

let confirmationRef = null;

export function getFirebaseAuth() {
  return getAuth(getApp());
}

export async function startPhoneVerification(phoneNumber) {
  const auth = getFirebaseAuth();
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber);
  confirmationRef = confirmation;
}

export async function confirmCode(code) {
  if (!confirmationRef) throw new Error('No pending verification');
  const result = await confirmationRef.confirm(code);
  const token = await result.user.getIdToken();
  return token;
}

export function clearConfirmation() {
  confirmationRef = null;
}

export function hasConfirmation() {
  return !!confirmationRef;
}
