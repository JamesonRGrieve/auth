'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import Link from 'next/link.js';
import { type ChangeEvent, type ReactElement, useId, useState } from 'react';
import { LuCheck as CheckIcon, LuMinus as MinusIcon } from 'react-icons/lu';
import { z } from 'zod';
import { useAuthServer } from '../AuthServerContext';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import useProducts, { type Price, type Product } from '../hooks/useProducts';
import { useUser } from '../hooks/useUser';
import { authRequest } from '../lib/api';
import { cn } from '../lib/utils';

const CENTS_PER_UNIT = 100;

const CheckoutSchema = z.object({ detail: z.string() });

type PricingCardProps = Product & {
  price: Price;
  isAnnual?: boolean;
  flatRate?: boolean;
};

/** The plans on sale, one card each with its first price. */
export default function PricingTable(): ReactElement | null {
  const { data: products = [] } = useProducts();
  if (products.length === 0) {
    return null;
  }
  return (
    <>
      <p className='mt-1 text-muted-foreground'>Whatever your status, our offers evolve according to your needs.</p>
      <div className='mx-auto my-10 flex max-w-4xl flex-col items-center gap-4 px-3 md:flex-row md:items-end'>
        {products.map((product) => {
          const price = product.prices.at(0);
          return price === undefined ? null : <PricingCard key={product.name} price={price} {...product} />;
        })}
      </div>
    </>
  );
}

export function PricingCard({
  name,
  description,
  price,
  marketing_features: marketingFeatures,
  priceAnnual,
  isMostPopular = false,
  flatRate = false,
  isAnnual = false,
}: PricingCardProps): ReactElement {
  const quantityId = useId();
  const authServer = useAuthServer();
  const { data: user } = useUser();
  const [quantity, setQuantity] = useState(1);
  const [problem, setProblem] = useState<string | null>(null);

  const checkout = (): void => {
    void (async (): Promise<void> => {
      try {
        const { detail } = await authRequest(`${authServer}/v1/checkout`, CheckoutSchema, {
          method: 'POST',
          body: { cart: [{ price: price.id, quantity }] },
        });
        window.location.href = detail;
      } catch (error) {
        setProblem(error instanceof Error ? error.message : 'Checkout could not start.');
      }
    })();
  };

  return (
    <Card
      className={cn(
        'w-full max-w-96 border-muted',
        isMostPopular ? 'mb-4 bg-primary text-primary-foreground shadow-lg' : 'mt-2',
      )}
    >
      <CardHeader className='pb-2 text-center'>
        {isMostPopular && (
          <Badge className='mb-3 w-max self-center bg-primary-foreground uppercase text-primary'>Most popular</Badge>
        )}
        <CardTitle className={isMostPopular ? 'mb-7!' : 'mb-7'}>{name}</CardTitle>
        {flatRate && (
          <span className='text-5xl font-bold'>
            {isAnnual
              ? priceAnnual
              : `$${price.amount / CENTS_PER_UNIT}${price.currency.toLocaleUpperCase()} / ${price.interval_count} ${price.interval}`}
          </span>
        )}
      </CardHeader>
      <CardDescription className={isMostPopular ? 'mx-auto w-11/12 text-primary-foreground' : 'text-center'}>
        {description}
      </CardDescription>
      <CardContent>
        <ul className='mt-7 space-y-2.5 text-sm'>
          {marketingFeatures.map((feature) => (
            <li className='flex space-x-2' key={feature.name}>
              {feature.name.startsWith('-') ? (
                <MinusIcon className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
              ) : (
                <CheckIcon className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
              )}
              <span className={isMostPopular ? 'text-primary-foreground' : 'text-muted-foreground'}>{feature.name}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className='flex flex-col gap-4'>
        {user === null || user === undefined ? (
          <Button asChild className='w-full text-foreground' variant='outline'>
            <Link href='/user'>Sign up</Link>
          </Button>
        ) : (
          <>
            <Label htmlFor={quantityId}>Initial users</Label>
            <Input
              id={quantityId}
              type='number'
              min={1}
              value={quantity}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuantity(Number(event.target.value))}
            />
            <Button className='w-full text-foreground' variant='outline' onClick={checkout}>
              Sign up
            </Button>
            {problem !== null && (
              <p role='alert' className='text-sm text-destructive'>
                {problem}
              </p>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
