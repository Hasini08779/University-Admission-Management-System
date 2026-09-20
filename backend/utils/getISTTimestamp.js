// Get current time in IST format as dd:mm:yy. hh:mm:ss
const getISTTimestamp = () => {
  const d = new Date();
  
  // IST = UTC + 5:30
  const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  
  const ss = String(istDate.getUTCSeconds()).padStart(2, '0');
  const hh = String(istDate.getUTCHours()).padStart(2, '0');
  const mm = String(istDate.getUTCMinutes()).padStart(2, '0');
  
  const yy = String(istDate.getUTCFullYear()).slice(-2);
  const mo = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  
  return `${day}:${mo}:${yy}. ${hh}:${mm}:${ss}`;
};

module.exports = getISTTimestamp;
