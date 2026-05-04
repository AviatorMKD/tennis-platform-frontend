import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        void i18n.changeLanguage(lng);
    };

    return (
        <Stack direction="row" spacing={1}>
            <Button
                size="small"
                variant="outlined"
                onClick={() => changeLanguage('en')}
                sx={{
                    minWidth: 44,
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.7)',
                    '&:hover': {
                        borderColor: '#ffffff',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                    },
                }}
            >
                EN
            </Button>

            <Button
                size="small"
                variant="outlined"
                onClick={() => changeLanguage('mk')}
                sx={{
                    minWidth: 44,
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.7)',
                    '&:hover': {
                        borderColor: '#ffffff',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                    },
                }}
            >
                MK
            </Button>
        </Stack>
    );
}