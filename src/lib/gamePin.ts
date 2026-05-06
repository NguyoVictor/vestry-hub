/**
 * Generate a unique 6-character alphanumeric PIN for quiz sessions
 * Excludes confusing characters: 0, O, 1, I
 */
export function generateGamePin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

/**
 * Check if a game PIN is unique among active sessions
 */
export async function isGamePinUnique(pin: string, supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('game_pin', pin)
    .in('status', ['waiting', 'active'])
    .limit(1);
    
  if (error) {
    console.error('Error checking PIN uniqueness:', error);
    return false;
  }
  
  return data.length === 0;
}

/**
 * Generate a unique game PIN by checking against existing sessions
 */
export async function generateUniqueGamePin(supabase: any): Promise<string> {
  let pin: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    pin = generateGamePin();
    attempts++;
    
    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique game PIN after maximum attempts');
    }
  } while (!(await isGamePinUnique(pin, supabase)));
  
  return pin;
}