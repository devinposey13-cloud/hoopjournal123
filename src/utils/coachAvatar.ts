export function getCoachAvatarUrl(voiceGender?: 'male' | 'female'): string {
  return voiceGender === 'female' ? '/coach-avatar-female.png' : '/coach-avatar.png';
}
