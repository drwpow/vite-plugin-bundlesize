import React from 'react';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import IndexPage from './pages/index.js';
import AboutPage from './pages/about.js';
import PokemonViewPage from './pages/pokemon/[number].js';

const router = createBrowserRouter([
  {
    path: '/',
    element: <IndexPage />,
  },
  {
    path: '/pokemon/:no',
    element: <PokemonViewPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
]);

export default function App() {
  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
}
