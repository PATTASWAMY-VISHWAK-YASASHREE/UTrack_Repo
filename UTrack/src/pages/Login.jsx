import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton'
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import CustomSpinner from '../components/CustomSpinner';


const Login = () => {
  const navigate=useNavigate();  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = async () =>{
    if(email==='' || password===''){
      alert("enter valid login details");

      return;
    }
    try{
      setLoading(true);
      const userDetails=await signInWithEmailAndPassword(auth,email,password);
      setLoading(false);
      const user=userDetails.user;
      console.log("successful login:",user);
      navigate('/dashboard');
    }
    catch(error){
      setLoading(false);
      console.error(error.message);
      alert("enter valid details");
    }
  };



  const handleSignup = () => {
    navigate('/signup');
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{backgroundColor: '#000'}}>
      <div className="container-fluid px-3">
        <div className="row justify-content-center">
       
          <div className="col-12" style={{maxWidth: '400px'}}>
          
            {/* Header with Logo */}
            <div className="flex items-center justify-start p-6 pt-12">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full"></div>
          </div>
          <span className="text-xl text-white font-semibold">UTrack</span>
        </div>
      </div>
            {/* Login Card */}
            <div className="card border-0 shadow-lg" style={{borderRadius: '20px'}}>
              <div className="card-body p-4">
                
                {/* Login Title */}
                <h3 className="text-center mb-4" style={{fontSize: '32px', fontWeight: '600', color: '#333'}}>
                  Login
                </h3>
                {loading && <CustomSpinner />}
                {/* Email Field */}
                <div className="mb-3">
                  <div className="form-label mb-2" style={{fontSize: '16px', color: '#666', fontWeight: '500'}}>
                    Email Id
                  </div>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      height: '50px',
                      fontSize: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>

                {/* Password Field */}
                <div className="mb-4">
                  <div className="form-label mb-2" style={{fontSize: '16px', color: '#666', fontWeight: '500'}}>
                    Password
                  </div>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter your PassWord"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      height: '50px',
                      fontSize: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>

                {/* Login Button */}
                <button
                  type="button"
                  className="btn w-100 mb-3"
                  onClick={handleLogin}
                  style={{
                    height: '50px',
                    fontSize: '18px',
                    fontWeight: '600',
                    backgroundColor: '#007bff',
                    border: 'none',
                    borderRadius: '25px',
                    color: '#fff'
                  }}
                >
                  login
                </button>

                {/* Or Divider */}
                <div className="text-center mb-3">
                  <span style={{fontSize: '16px', color: '#666', fontWeight: '600'}}>Or</span>
                </div>

                {/* Google Login Button */}
                <GoogleLoginButton/>

                {/* Signup Link */}
                <div className="text-center">
                  <span style={{fontSize: '16px', color: '#666'}}>
                    Don't have an account?{' '}
                    <button 
                      className="btn p-0"
                      onClick={handleSignup}
                      style={{
                        color: '#007bff',
                        textDecoration: 'none',
                        fontWeight: '600',
                        border: 'none',
                        background: 'none',
                        fontSize: '16px'
                      }}
                    >
                      Signup
                    </button>
                  </span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap CSS */}
      <link
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css"
        rel="stylesheet"
      />
    </div>
  );
};

export default Login;