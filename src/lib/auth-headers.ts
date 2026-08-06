export function authenticatedJsonHeaders(idToken: string): Record<string, string> {
    if (!idToken.trim()) throw new Error('A valid authentication token is required');
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
    };
}
