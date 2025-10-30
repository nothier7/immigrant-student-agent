"use client";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Handshake, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buttonCn } from "@/app/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-16 md:pt-24">
      <div className="mx-auto grid max-w-3xl gap-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl text-heading"
        >
          Scholarships, mentors, and resources —
          <span className="block">tailored for immigrant students.</span>
        </motion.h1>

        <p className="text-base md:text-lg text-text/85">
          Answer a few questions about your background (e.g., DACA, state, school), and our agent curates verified
          opportunities you can actually use.
        </p>

        {/* Centered CTA */}
        <div className="mx-auto flex w-full max-w-xl items-center justify-center">
          <Link href="/try" className={buttonCn({ variant: "outline", size: "md" })}>
            Try it Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Three quick highlights */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 pt-8 md:grid-cols-3">
          {[
            { icon: GraduationCap, title: "Scholarship Finder", desc: "Filter by status, state, and deadlines." },
            { icon: Handshake, title: "Community", desc: "Connect with immigrant students like you" },
            { icon: ShieldCheck, title: "Undocu-friendly", desc: "Opportunities that don’t require a green card or citizenship." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-[color:rgb(var(--glass-border)/0.18)] bg-card p-5 shadow-card text-center"
            >
              <div className="flex flex-col items-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:rgb(var(--primary)/0.08)]">
                  <f.icon className="h-5 w-5 text-heading" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-heading">{f.title}</h3>
                <p className="mt-1 text-sm text-text/80">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
