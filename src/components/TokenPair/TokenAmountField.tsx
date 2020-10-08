import TextField from "@material-ui/core/TextField";
import React, { ChangeEvent, FC, useCallback, useState } from "react";
import { InputLabelProps } from "@material-ui/core";
import { useIntl } from "react-intl";
import { Token } from "../../api/token/Token";
import { majorAmountToMinor, minorAmountToMajor } from "../../utils/amount";
import { IntlNumberParser } from "../../utils/IntlNumberParser";

type Props = {
  label?: string;
  amount?: number;
  updateAmount?: (minorAmount: number) => void;
  token?: Token;
  loading?: boolean;
  dataTestId: string;
  disabled?: boolean;
  required?: boolean;
  inputLabelProps?: Partial<InputLabelProps>;
  helperText?: string;
};

const TokenAmountField: FC<Props> = ({
  label = "tokenAmountField.defaultLabel",
  amount = 0,
  token,
  loading = false,
  updateAmount,
  dataTestId,
  disabled = loading || !token || !updateAmount,
  required = false,
  inputLabelProps = {},
  helperText,
}: Props) => {
  const intl = useIntl();
  const intlNumberParser = new IntlNumberParser(intl.locale);

  const parseNumber = useCallback(
    (numberString: string) => intlNumberParser.parse(numberString),
    [intlNumberParser]
  );

  const [value, setValue] = useState("" + amount);

  const updateApplicationState = (majorAmount: number) =>
    token &&
    updateAmount &&
    updateAmount(majorAmountToMinor(majorAmount, token));

  /**
   * For formatting purpose avoid that the input can allow typing more than decimals allowed
   * @param value
   * @param decimals
   */
  const checkMaxDecimals = (value: string, decimals: number): boolean => {
    if (value.includes(".")) {
      const decimalValues = value.substring(value.lastIndexOf(".") + 1);
      if (decimalValues.length > decimals) return false;
    }
    return true;
  };

  const valueHasChanged = (
    event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const valueString = event.target.value;
    const parsedNumber = parseNumber(valueString);

    const hasValidDecimals = token
      ? checkMaxDecimals(valueString, token.decimals)
      : true;
    // avoid that other characters are typed here
    if (!isNaN(parsedNumber) && hasValidDecimals) {
      setValue(valueString);
      updateApplicationState(parsedNumber);
    }
  };

  /**
   * Convert a non formatted value with decimals into a formatted value to show on the UI
   * It will contain the .00
   * This is useful in cases that the amount is updated outside of this component
   * @param value
   * @param decimals
   */
  const formatValue = useCallback(
    (value: string, decimals: number): string => {
      const formattedValueString =
        value.substring(0, value.length - decimals) +
        "." +
        value.substring(value.length - decimals);
      // amount is always respecting the decimals from the token, so we have to format the value accordingly
      return intl.formatNumber(Number(formattedValueString));
    },
    [intl]
  );

  const getValue = useCallback(() => {
    if (disabled && token)
      return intl.formatNumber(Number(minorAmountToMajor(amount, token)));
    else if (token) {
      // test if local value state equals rendered amount state
      const valueWithDecimals = majorAmountToMinor(parseNumber(value), token);
      if (valueWithDecimals !== amount) {
        // we can assume that on state, all the values are coming with major amounts and decimals
        return formatValue(amount.toString(), token.decimals);
      }
    }
    return value;
  }, [disabled, token, amount, value, intl, parseNumber, formatValue]);

  return (
    <TextField
      label={intl.formatMessage({ id: label })}
      disabled={disabled}
      required={required}
      value={getValue()}
      onChange={valueHasChanged}
      InputLabelProps={inputLabelProps}
      data-testid={dataTestId}
      helperText={helperText && intl.formatMessage({ id: helperText })}
      error={!!helperText}
    />
  );
};

export default TokenAmountField;
