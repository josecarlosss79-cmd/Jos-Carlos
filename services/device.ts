
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const getDeviceProfile = () => {
  return isMobile() ? 'mobile' : 'desktop';
};
