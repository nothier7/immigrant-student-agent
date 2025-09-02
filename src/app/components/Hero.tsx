"use client";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Handshake, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl pt-16 md:pt-24 px-4">
      <div className="mx-auto grid max-w-3xl gap-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight"
        >
          Scholarships, mentors, and resources —
          <span className="block">tailored for immigrant students.</span>
        </motion.h1>

        <p className="text-neutral-600 dark:text-neutral-300 text-base md:text-lg">
          Answer a few questions about your background (e.g., DACA, state, school), and our agent curates verified opportunities you can actually use.
        </p>

        {/* Centered CTA */}
        <div className="mx-auto flex w-full max-w-xl items-center justify-center">
          <Link
            href="/try"
            className="inline-flex items-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-semibold"
          >
            Try it Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Three quick highlights */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-3 gap-3 pt-8">
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
              className="rounded-2xl border border-black/10 dark:border-white/10 p-4 md:p-5 bg-white/60 dark:bg-neutral-900/60"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
                  <f.icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
