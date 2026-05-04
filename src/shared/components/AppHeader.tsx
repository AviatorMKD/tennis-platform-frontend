import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/useAuth';
import { getMyOperatorClubCards } from '../../api/operatorDashboard.api';
import { getMyProfile } from '../../api/users.api';
import { LanguageSwitcher } from './LanguageSwitcher';

type AppHeaderProps = {
  title?: string;
};

export function AppHeader({ title }: AppHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

  const { isAuthenticated, user, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [navAnchorEl, setNavAnchorEl] = useState<null | HTMLElement>(null);

  const isMenuOpen = Boolean(anchorEl);
  const isNavMenuOpen = Boolean(navAnchorEl);
  const isSystemAdmin = user?.role === 'SystemAdmin';
  const currentUserId = user?.id ?? null;

  const operatorAccessQuery = useQuery({
    queryKey: ['operator-access-header', currentUserId, isSystemAdmin],
    queryFn: () => getMyOperatorClubCards(currentUserId!, isSystemAdmin),
    enabled: isAuthenticated && currentUserId != null,
    staleTime: 60_000,
  });

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const profile = profileQuery.data;

  const canAccessOperatorArea =
    isSystemAdmin || (operatorAccessQuery.data?.length ?? 0) > 0;

  const profileInitials =
    `${profile?.firstName?.trim()?.[0] ?? ''}${profile?.lastName?.trim()?.[0] ?? ''}`.toUpperCase() ||
    user?.username?.trim()?.[0]?.toUpperCase() ||
    'U';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNavAnchorEl(event.currentTarget);
  };

  const handleNavMenuClose = () => {
    setNavAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    handleNavMenuClose();
    logout();
    queryClient.clear();
    void navigate('/login');
  };

  const handleNavigate = (path: string) => {
    handleMenuClose();
    handleNavMenuClose();
    void navigate(path);
  };

  const navItems = [
    { label: 'Discover', path: '/', show: true },
    { label: t('myBookings'), path: '/app/bookings', show: isAuthenticated },
    { label: 'Invitations', path: '/app/invitations', show: isAuthenticated },
    { label: 'Operator', path: '/operator', show: isAuthenticated && canAccessOperatorArea },
    { label: 'Users', path: '/admin/users', show: isAuthenticated && isSystemAdmin },
    {
      label: 'Club Operators',
      path: '/admin/club-operators',
      show: isAuthenticated && isSystemAdmin,
    },
    {
      label: 'Notification Settings',
      path: '/admin/notification-settings',
      show: isAuthenticated && isSystemAdmin,
    },
    { label: t('login'), path: '/login', show: !isAuthenticated },
    { label: 'Register', path: '/register', show: !isAuthenticated },
  ].filter((item) => item.show);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            color: 'inherit',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          {title ?? t('appName')}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isNarrow ? (
            <>
              <IconButton
                color="inherit"
                onClick={handleNavMenuOpen}
                aria-label="navigation menu"
                aria-controls={isNavMenuOpen ? 'navigation-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={isNavMenuOpen ? 'true' : undefined}
              >
                <MenuIcon />
              </IconButton>

              <Menu
                id="navigation-menu"
                anchorEl={navAnchorEl}
                open={isNavMenuOpen}
                onClose={handleNavMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {navItems.map((item) => (
                  <MenuItem key={item.path} onClick={() => handleNavigate(item.path)}>
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : (
            <>
              {navItems.map((item) => (
                <Button key={item.path} color="inherit" component={RouterLink} to={item.path}>
                  {item.label}
                </Button>
              ))}
            </>
          )}

          {isAuthenticated && (
            <>
              <IconButton
                color="inherit"
                onClick={handleMenuOpen}
                aria-label="account menu"
                aria-controls={isMenuOpen ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={isMenuOpen ? 'true' : undefined}
                sx={{ p: 0.5 }}
              >
                <Avatar
                  src={profile?.profileImage?.url ?? undefined}
                  alt={user?.username || 'User'}
                  sx={{
                    width: 34,
                    height: 34,
                    fontSize: 13,
                    fontWeight: 900,
                    bgcolor: 'rgba(255,255,255,0.24)',
                    color: 'common.white',
                    border: '1px solid rgba(255,255,255,0.45)',
                  }}
                >
                  {profileInitials}
                </Avatar>
              </IconButton>

              <Menu
                id="account-menu"
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {user?.username || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>

                <Divider />

                <MenuItem onClick={() => handleNavigate('/app/profile')}>
                  Profile
                </MenuItem>

                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          )}

          <LanguageSwitcher />
        </Box>
      </Toolbar>
    </AppBar>
  );
}