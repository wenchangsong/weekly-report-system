import { useState, useCallback } from 'react';

type Validator<T> = (values: T) => Partial<Record<keyof T, string>>;

export function useForm<T extends Record<string, any>>(initial: T, validate?: Validator<T>) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate) {
          const validationErrors = validate(values);
          if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setTouched(
              Object.keys(values).reduce((acc, k) => ({ ...acc, [k]: true }), {} as any)
            );
            return;
          }
        }
        await onSubmit(values);
      };
    },
    [values, validate]
  );

  const reset = useCallback(() => {
    setValues(initial);
    setErrors({});
    setTouched({});
  }, [initial]);

  return { values, errors, touched, handleChange, handleSubmit, reset, setValues };
}
