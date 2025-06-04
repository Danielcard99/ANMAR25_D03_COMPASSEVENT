import { hashPassword } from './hash.util';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue(10),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('hashPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should hash password using bcrypt', async () => {
    const mockPassword = 'password123';
    const mockHashedPassword = 'hashed-password';
    
    (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
    
    const result = await hashPassword(mockPassword);
    
    expect(bcrypt.genSalt).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, expect.anything());
    expect(result).toBe(mockHashedPassword);
  });

  it('should throw error if bcrypt.hash fails', async () => {
    const mockPassword = 'password123';
    const mockError = new Error('Hash error');
    
    (bcrypt.hash as jest.Mock).mockRejectedValue(mockError);
    
    await expect(hashPassword(mockPassword)).rejects.toThrow(mockError);
  });
});