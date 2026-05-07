// Font family names for Inter fonts
// These correspond to the TTF files placed in src/assets/fonts/

export const fontFamily = {
  Inter_100: 'Inter-Thin',
  Inter_200: 'Inter-ExtraLight',
  Inter_300: 'Inter-Light',
  Inter_400: 'Inter-Regular',
  Inter_500: 'Inter-Medium',
  Inter_600: 'Inter-SemiBold',
  Inter_700: 'Inter-Bold',
  Inter_800: 'Inter-ExtraBold',
  Inter_900: 'Inter-Black',
};

// Helper function to get font with weight
export const getFontFamily = (weight = 400) => {
  const fontMap = {
    100: fontFamily.Inter_100,
    200: fontFamily.Inter_200,
    300: fontFamily.Inter_300,
    400: fontFamily.Inter_400,
    500: fontFamily.Inter_500,
    600: fontFamily.Inter_600,
    700: fontFamily.Inter_700,
    800: fontFamily.Inter_800,
    900: fontFamily.Inter_900,
  };
  return fontMap[weight] || fontFamily.Inter_400;
};
