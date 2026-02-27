export const ok = (res, data, message = 'Success') => {
  return res.status(200).json({ success: true, message, data });
};

export const created = (res, data, message = 'Created') => {
  return res.status(201).json({ success: true, message, data });
};
