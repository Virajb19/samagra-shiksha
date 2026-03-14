"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "nextjs-toploader/app";
import { motion } from "framer-motion";
import Image from "next/image";

import { loginSchema, LoginSchema } from "@/lib/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { showSuccessToast } from "@/components/ui/custom-toast";
import { Shield, Lock, Mail, Phone } from "lucide-react";

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState("");

  const router = useRouter();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      email: "",
      password: "",
    },
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason == "auth") {
      toast.error("You need to signin first", {
        duration: 4000,
        closeButton: true,
        position: "top-center",
      });
      router.replace("/login");
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginSchema) => {
    setServerError("");

    try {
      await login(data.email, data.password, data.phone);
      showSuccessToast("Login successful! Welcome Back.", 4000, "top-center");
      form.reset({ email: "", password: "", phone: "" });
      router.push("/dashboard");
    } catch (err: any) {
      let message = "Login failed. Please check your credentials.";

      if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setServerError(message);
      toast.error(message, {
        position: "top-center",
        duration: 6000,
        closeButton: false,
      });
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-teal-700 via-cyan-800 to-blue-900 flex items-center justify-center px-6 py-8 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-400/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-400/10 rounded-full blur-[80px]" />
      </div>

      {/* Main content — two separate cards side by side */}
      <div className="relative flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8 w-full h-full max-w-none">
        {/* ─── Left: Login Card ──────────────────────────────────────── */}
        <motion.div
          className="w-full lg:w-[600px] my-10 flex-shrink-0 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 lg:p-14 shadow-2xl shadow-black/40 flex flex-col justify-center"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Branding */}
          <div className="flex items-center gap-4 mb-10">
            <motion.div
              className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Shield className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">
                Secure Track
              </h1>
              <p className="text-sm text-slate-400">Administration Portal</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-base text-slate-400 mb-10">
            Sign in to access the admin dashboard
          </p>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-base font-medium">
                      Email
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="admin@gov.in"
                          className="pl-12 bg-white/5 border-white/10 text-white text-base placeholder:text-slate-500 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-xl h-14"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-base font-medium">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-12 bg-white/5 border-white/10 text-white text-base placeholder:text-slate-500 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-xl h-14"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-base font-medium">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+91 XXXXX XXXXX"
                          className="pl-12 bg-white/5 border-white/10 text-white text-base placeholder:text-slate-500 transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-xl h-14"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Server Error */}
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <p className="text-sm text-red-400">{serverError}</p>
                </motion.div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full flex-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 rounded-xl h-14 cursor-pointer disabled:cursor-not-allowed text-lg"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <div className="size-5 border-2 border-t-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>

          <p className="text-sm text-slate-500 text-center mt-10">
            Secure Government System • Authorized Personnel Only
          </p>
        </motion.div>

        {/* ─── Right: NBSE Image Card ────────────────────────────────── */}
        <motion.div
          className="hidden lg:flex flex-1 w-[2vw] relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 bg-slate-900/60 items-center justify-center"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          {/* Full image — object-contain so nothing is cropped */}
          <Image
            src="/banner-nbse.jpg"
            alt="Board of Secondary Education Building"
            fill
            className="object-right"
            priority
            sizes="(min-width: 1024px) 55vw, 0vw"
          />

          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-slate-900/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/30 to-transparent" />

          {/* Diagonal shimmer — using framer-motion for reliability */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ overflow: "hidden" }}
          >
            <motion.div
              className="absolute top-0 h-full w-[60%]"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
              }}
              initial={{ left: "-60%" }}
              animate={{ left: "160%" }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 2,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Bottom text overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <h3 className="text-white text-xl font-bold mb-1">
                Board of Secondary Education
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Nagaland Board of School Education
                <br />
                Secure Tracking & Administration System
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
