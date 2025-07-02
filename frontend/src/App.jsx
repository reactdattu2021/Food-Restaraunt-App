import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home/home";
import Contacts from "./pages/contacts/contacts";
import About from "./pages/aboutpages/about";
import Menu from "./pages/menu/menu";
import Cart from "./pages/cart/cart";
import Login from "./components/login/login";
import Navbar from "./components/Navbar/navbar";
import PriveteRoute from './components/priveteRoute/priveteRoute'
import Signup from "./components/signup/signup";


const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contacts />} />
        <Route path="/about" element={<About />} />
        <Route path="/menu" element={<Menu />} />
       
        <Route path="/login" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
     
      <Route path='/cart' element={
        <PriveteRoute>
          <Cart />
        </PriveteRoute>} />
    </Routes>
    </>
  );
};

export default App;
