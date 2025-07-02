import React from "react";
import Navber from "../../components/Navbar/navbar";
import Banner from "../../components/banner/banner";
import SpecialOffer from "../../components/specialOffer/specialOffer";
import AboutHome from "../../components/aboutHome/aboutHome";
import OurHomeMenu from "../../components/ourHomeMenu/ourHomeMenu";
import Footer from "../../components/footer/Footer";

const Home = () => {
  return (
    <>
      <Navber />
      <Banner />
      <SpecialOffer/>
      <AboutHome/>
      <OurHomeMenu/>
      <Footer/>
    </>
  );
};
export default Home;
