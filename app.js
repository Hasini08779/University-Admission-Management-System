// Initialize users storage
if(!localStorage.getItem("users")){
  localStorage.setItem("users", JSON.stringify([]));
}

// LOGOUT FUNCTION
async function logout(){
  await logoutUser();
  window.location.href="index.html";
}