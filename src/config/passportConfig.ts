import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { userService } from '../services/userService';
import { authConfig } from './authConfig';
import { logInfo, logError } from '../utils/dataForSEOLogger';
import { JwtPayload } from '../utils/jwtUtils';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await userService.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email: string, password: string, done) => {
    try {
      logInfo('Local strategy authentication attempt', { email });
      
      const user = await userService.validateUserPassword(email, password);
      
      if (!user) {
        logInfo('Local strategy authentication failed - invalid credentials', { email });
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      logInfo('Local strategy authentication successful', { userId: user.id, email: user.email });
      return done(null, user);
    } catch (error) {
      logError('Local strategy authentication error', error);
      return done(error);
    }
  }
));

passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: authConfig.jwt.secret,
    issuer: 'trendible-backend',
    audience: 'trendible-frontend'
  },
  async (payload: JwtPayload, done) => {
    try {
      logInfo('JWT strategy authentication attempt', { userId: payload.userId, type: payload.type });
      
      if (payload.type !== 'access') {
        logInfo('JWT strategy authentication failed - invalid token type', { userId: payload.userId, type: payload.type });
        return done(null, false, { message: 'Invalid token type' });
      }
      
      const user = await userService.findUserById(payload.userId);
      
      if (!user) {
        logInfo('JWT strategy authentication failed - user not found', { userId: payload.userId });
        return done(null, false, { message: 'User not found' });
      }
      
      logInfo('JWT strategy authentication successful', { userId: user.id, email: user.email });
      return done(null, user);
    } catch (error) {
      logError('JWT strategy authentication error', error);
      return done(error);
    }
  }
));

export default passport;