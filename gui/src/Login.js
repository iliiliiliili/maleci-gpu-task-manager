import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (login.trim() && password.trim()) {
      navigate("/app"); // Navigate to the main app
    } else {
      alert("Please enter both login and password.");
    }
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#1e1e1e",
      color: "#f5f5f5",
      fontFamily: "'Roboto', sans-serif",
    },
    input: {
      padding: "10px",
      margin: "10px 0",
      fontSize: "1rem",
      borderRadius: "5px",
      border: "1px solid #555",
      backgroundColor: "#333",
      color: "#fff",
      width: "300px",
    },
    button: {
      padding: "10px 20px",
      backgroundColor: "#3498db",
      color: "#fff",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "1rem",
      transition: "background-color 0.3s",
    },
    buttonHover: {
      backgroundColor: "#2980b9",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    title: {
      fontSize: "2rem",
      marginBottom: "20px",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Login</h2>
      <input
        type="text"
        placeholder="Login"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        style={styles.input}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />
      <button style={styles.button} onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
