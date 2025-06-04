export function createConfirmationEmail(link: string) {
  return `
    <div>
      <h1>Confirm your email</h1>
      <p>Click the link below to confirm your email:</p>
      <a href="${link}">${link}</a>
    </div>
  `;
}
