'use client'

import Link from 'next/link';
import { Button } from '../components/ui/button';
import {Home, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 bg-slate-50">
      <main className="flex flex-col items-center justify-center p-8 text-center">
        <motion.div animate={{ rotate: [0,7,-7,0]}} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.5}}>
           <AlertTriangle className='size-24 text-yellow-500 mb-2'/>
        </motion.div>
        <h1 className="mb-4 text-4xl font-bold tracking-tighter dark:text-white text-slate-900 md:text-6xl">
          404 - Page Not Found
        </h1>
        <p className="mb-8 text-lg dark:text-white/80 text-slate-900 md:text-xl">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Button size="lg" className='font-semibold py-2 px-4 dark:text-white'>
          <Home className='h-5 w-5' strokeWidth={3}/>
          <Link href="/">Go Back Home</Link>
        </Button> 
      </main>
    </div>
  );
};

export default NotFound;